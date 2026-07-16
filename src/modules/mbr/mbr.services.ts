import { Request, Response, NextFunction } from "express";
import { mbrModel } from "../DB/models/mbr.model.js";
import { formulaModel } from "../DB/models/formula.model.js";
import { ingredientModel } from "../DB/models/ingredient.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import { calculateBatchWeights } from "../../services/batchCalculation.service.js";
import { validateFormula } from "../../services/autoValidation.service.js";
import * as validation from "./mbr.validation.js";

class MbrService {
  constructor() {}

  private generateMbrCode = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const lastMbr = await mbrModel
      .findOne({ mbrCode: { $regex: `^MBR-${year}-` } })
      .sort({ createdAt: -1 })
      .select("mbrCode")
      .lean();

    let nextNumber = 1;
    if (lastMbr?.mbrCode) {
      const match = lastMbr.mbrCode.match(/MBR-\d{4}-(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `MBR-${year}-${String(nextNumber).padStart(3, "0")}`;
  };

  private incrementRevision = (currentRevision: string): string => {
    // Format: "Rev A.1" → "Rev A.2" → ... → "Rev A.9" → "Rev B.1"
    const match = currentRevision.match(/Rev\s+([A-Z])\.(\d+)/);
    if (!match?.[1] || !match[2]) return "Rev A.1";

    const letter = match[1];
    const number = parseInt(match[2], 10);

    if (number >= 9) {
      const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
      return `Rev ${nextLetter}.1`;
    }

    return `Rev ${letter}.${number + 1}`;
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createMbrSchema.parse(req.body);
    const userId = (req as any).user._id;

    // Verify formula exists
    const formula = await formulaModel.findById(data.formulaId).lean();
    if (!formula) {
      throw new BadRequestException("Formula not found");
    }

    const mbrCode = await this.generateMbrCode();

    // Build phases from formula if not provided directly
    let phases = data.phases;
    if (phases.length === 0 && formula.phases.length > 0) {
      const allIngIds = formula.phases.flatMap((p) =>
        p.ingredients.map((i) => i.ingredientId)
      );
      const ingredientDocs = await ingredientModel
        .find({ _id: { $in: allIngIds } })
        .select("commercialName inciName")
        .lean();

      const ingMap = new Map(
        ingredientDocs.map((d) => [d._id.toString(), d])
      );

      phases = formula.phases.map((p) => ({
        phaseName: p.phaseName,
        subtotal: 0,
        ingredients: p.ingredients.map((i) => {
          const doc = ingMap.get(i.ingredientId.toString());
          return {
            ingredientId: i.ingredientId.toString(),
            ingredientName: doc?.commercialName ?? "Unknown",
            inciName: doc?.inciName ?? "Unknown",
            targetPercentage: i.targetPercentage,
            calculatedWeight: 0,
            checked: false,
          };
        }),
      }));
    }

    // Calculate batch weights
    if (phases.length > 0 && data.batchSize.value > 0) {
      const batchResult = calculateBatchWeights({
        batchSizeValue: data.batchSize.value,
        batchSizeUnit: data.batchSize.unit,
        phases: phases.map((p) => ({
          phaseId: null as any,
          phaseName: p.phaseName,
          ingredients: p.ingredients.map((i) => ({
            ingredientId: i.ingredientId as any,
            targetPercentage: i.targetPercentage,
            calculatedWeight: 0,
          })),
        })),
      });

      phases = phases.map((phase, i) => ({
        ...phase,
        subtotal: batchResult.phases[i]?.subtotal ?? 0,
        ingredients: phase.ingredients.map((ing, j) => ({
          ...ing,
          calculatedWeight:
            batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
        })),
      }));
    }

    // Run auto-validation
    const validationChecks = await validateFormula({
      targetpHMin: data.targetpHMin,
      targetpHMax: data.targetpHMax,
      phases: phases.map((p) => ({
        phaseName: p.phaseName,
        ingredients: p.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          targetPercentage: i.targetPercentage,
        })),
      })),
    });

    const totalBatchWeight = phases.reduce((sum, p) => sum + (p.subtotal || 0), 0);

    const mbrPayload = stripUndefined({
      mbrCode,
      formulaId: data.formulaId,
      status: data.status,
      revision: "Rev A.1",
      batchSize: data.batchSize,
      targetpHMin: data.targetpHMin,
      targetpHMax: data.targetpHMax,
      estProductionTime: data.estProductionTime ?? { value: 0, unit: "hrs" as const },
      phases,
      totalBatchWeight: Math.round(totalBatchWeight * 1000) / 1000,
      productionSteps: data.productionSteps,
      validationChecks,
      createdBy: userId,
    });

    const mbr = await mbrModel.create(mbrPayload as any);

    res.status(201).json({
      message: "MBR created successfully",
      mbr,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;

    const mbrs = await mbrModel
      .find({ createdBy: userId })
      .select("mbrCode status revision batchSize totalBatchWeight createdAt updatedAt")
      .populate("formulaId", "formulaName category")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      message: "MBRs retrieved successfully",
      count: mbrs.length,
      mbrs,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.mbrIdParamSchema.parse(req.params);

    const mbr = await mbrModel
      .findById(id)
      .populate("formulaId", "formulaName category formulaType")
      .lean();

    if (!mbr) {
      throw new BadRequestException("MBR not found");
    }

    res.status(200).json({
      message: "MBR retrieved successfully",
      mbr,
    });
  };

  saveProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.mbrIdParamSchema.parse(req.params);
    const data = validation.updateMbrSchema.parse(req.body);

    const existing = await mbrModel.findById(id);
    if (!existing) {
      throw new BadRequestException("MBR not found");
    }

    // Increment revision on each save
    const newRevision = this.incrementRevision(existing.revision);

    // Recalculate weights if phases changed
    if (data.phases && data.phases.length > 0) {
      const batchSize = data.batchSize ?? existing.batchSize;

      const batchResult = calculateBatchWeights({
        batchSizeValue: batchSize.value,
        batchSizeUnit: batchSize.unit,
        phases: data.phases.map((p) => ({
          phaseId: null as any,
          phaseName: p.phaseName,
          ingredients: p.ingredients.map((i) => ({
            ingredientId: i.ingredientId as any,
            targetPercentage: i.targetPercentage,
            calculatedWeight: 0,
          })),
        })),
      });

      const updatedPhases = data.phases.map((phase, i) => ({
        ...phase,
        subtotal: batchResult.phases[i]?.subtotal ?? 0,
        ingredients: phase.ingredients.map((ing, j) => ({
          ...ing,
          calculatedWeight:
            batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
        })),
      }));

      // Re-run validation
      const validationChecks = await validateFormula({
        targetpHMin: data.targetpHMin ?? existing.targetpHMin ?? undefined,
        targetpHMax: data.targetpHMax ?? existing.targetpHMax ?? undefined,
        phases: updatedPhases.map((p) => ({
          phaseName: p.phaseName,
          ingredients: p.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            targetPercentage: i.targetPercentage,
          })),
        })),
      });

      const totalBatchWeight = updatedPhases.reduce(
        (sum, p) => sum + (p.subtotal || 0),
        0
      );

      const mbr = await mbrModel.findByIdAndUpdate(
        id,
        stripUndefined({
          ...data,
          phases: updatedPhases,
          totalBatchWeight: Math.round(totalBatchWeight * 1000) / 1000,
          validationChecks,
          revision: newRevision,
        } as any),
        { new: true }
      );

      res.status(200).json({
        message: "MBR progress saved successfully",
        mbr,
      });
      return;
    }

    // Simple update without phase recalculation
    const mbr = await mbrModel.findByIdAndUpdate(
      id,
      stripUndefined({ ...data, revision: newRevision } as any),
      { new: true }
    );

    res.status(200).json({
      message: "MBR progress saved successfully",
      mbr,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.mbrIdParamSchema.parse(req.params);

    const mbr = await mbrModel.findByIdAndDelete(id);
    if (!mbr) {
      throw new BadRequestException("MBR not found");
    }

    res.status(200).json({
      message: "MBR deleted successfully",
    });
  };
}

export const mbrService = new MbrService();
