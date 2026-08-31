import { Request, Response, NextFunction } from "express";
import { formulaModel } from "../DB/models/formula.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import { calculateBatchWeights } from "../../services/batchCalculation.service.js";
import { validateFormula } from "../../services/autoValidation.service.js";
import { balanceFormulaQS } from "../../services/qsBalancer.service.js";
import * as validation from "./formula.validation.js";

class FormulaService {
  constructor() {}

  private getOwnershipFilter(id: string, req: Request) {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    return userRole === "admin" ? { _id: id } : { _id: id, createdBy: userId };
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createFormulaSchema.parse(req.body);
    const userId = (req as any).user._id;

    let phases = data.phases;
    const hasIngredients = phases.some((p) => p.ingredients && p.ingredients.length > 0);

    if (hasIngredients) {
      // 1. Auto-balance Q.S. (Quantum Satis) for primary solvent
      const qsResult = await balanceFormulaQS(phases as any);
      phases = qsResult.phases as any;

      // 2. Strict Formula Validation
      const checks = await validateFormula(
        {
          targetpHMin: data.targetpHMin,
          targetpHMax: data.targetpHMax,
          phases: phases.map((p) => ({
            phaseName: p.phaseName,
            ingredients: (p.ingredients || []).map((i) => ({
              ingredientId: i.ingredientId.toString(),
              targetPercentage: i.targetPercentage,
            })),
          })),
        },
        data.templateId?.toString()
      );

      const hasErrors = checks.some((c) => c.status === "error");
      const totalCheck = checks.find((c) => c.name === "Total formula equals 100%");
      const isNot100 = totalCheck && totalCheck.status !== "success";

      if (hasErrors || isNot100) {
        const errorDetails = checks
          .filter(
            (c) =>
              c.status === "error" ||
              (c.name === "Total formula equals 100%" && c.status !== "success")
          )
          .map((c) => c.message)
          .join(" | ");

        throw new BadRequestException(
          `Formula validation failed: ${errorDetails || "Ensure total formula is exactly 100% and safety limits are met."}`
        );
      }

      // 3. Calculate Batch Weights
      if (data.targetBatchSize > 0) {
        const batchResult = calculateBatchWeights({
          batchSizeValue: data.targetBatchSize,
          batchSizeUnit: data.measurementUnit,
          phases: phases as any,
        });

        phases = phases.map((phase, i) => ({
          ...phase,
          ingredients: (phase.ingredients || []).map((ing, j) => ({
            ...ing,
            calculatedWeight: batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
          })),
        }));
      }
    }

    const formula = await formulaModel.create(
      stripUndefined({ ...data, phases, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Formula created successfully",
      formula,
    });
  };

  createFromTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { templateId } = req.params;
    const userId = (req as any).user._id;

    const { formulaTemplateModel } = await import("../DB/models/formulaTemplate.model.js");
    const template = await formulaTemplateModel.findById(templateId).lean();

    if (!template) {
      throw new BadRequestException("Formula Template not found");
    }

    // Check if user has access to this template's package (unless admin)
    if ((req as any).user.role !== "admin") {
      const { userModel } = await import("../DB/models/user.model.js");
      const user = await userModel.findById(userId).lean();
      const purchasedPackages = user?.purchasedPackages.map(String) || [];
      if (!purchasedPackages.includes(String(template.packageId))) {
        throw new BadRequestException("You have not purchased access to this template");
      }
    }

    // Clone the template phases into an empty formula structure
    const clonedPhases = template.phases.map((p) => ({
      ...(p.phaseId ? { phaseId: p.phaseId } : {}),
      phaseName: p.phaseName,
      ingredients: [], // User will fill these in via update
    }));

    const formula = await formulaModel.create(
      stripUndefined({
        formulaName: `${template.templateName} (My Copy)`,
        category: template.category,
        formulaType: template.formulaType,
        templateId: template._id,
        phases: clonedPhases,
        createdBy: userId,
        status: "Draft",
        targetBatchSize: 1, // Default
      }) as any
    );

    res.status(201).json({
      message: "Formula cloned from template successfully",
      formula,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const formulas = await formulaModel
      .find(filter)
      .select("formulaName category status formulaType targetBatchSize measurementUnit createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      message: "Formulas retrieved successfully",
      count: formulas.length,
      formulas,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const filter = this.getOwnershipFilter(id, req);

    const formula = await formulaModel
      .findOne(filter)
      .populate("templateId", "templateName description methodSteps")
      .populate("phases.phaseId", "name code description")
      .populate("phases.ingredients.ingredientId", "commercialName inciName internalCode categoryId usageGuidelines")
      .lean();

    if (!formula) {
      throw new BadRequestException("Formula not found or you do not have permission");
    }

    res.status(200).json({
      message: "Formula retrieved successfully",
      formula,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const data = validation.updateFormulaSchema.parse(req.body);
    const filter = this.getOwnershipFilter(id, req);

    const existing = await formulaModel.findOne(filter);
    if (!existing) {
      throw new BadRequestException("Formula not found or you do not have permission");
    }

    let phases = data.phases;

    if (phases && phases.length > 0) {
      const hasIngredients = phases.some(
        (p) => p.ingredients && p.ingredients.length > 0
      );

      if (hasIngredients) {
        // 1. Auto-balance Q.S. (Quantum Satis) for primary solvent
        const qsResult = await balanceFormulaQS(phases as any);
        phases = qsResult.phases as any;

        // 2. Strict Formula Validation
        const checks = await validateFormula(
          {
            targetpHMin: data.targetpHMin ?? existing.targetpHMin,
            targetpHMax: data.targetpHMax ?? existing.targetpHMax,
            phases: (phases || []).map((p) => ({
              phaseName: p.phaseName,
              ingredients: (p.ingredients || []).map((i) => ({
                ingredientId: i.ingredientId.toString(),
                targetPercentage: i.targetPercentage,
              })),
            })),
          },
          existing.templateId?.toString()
        );

        const hasErrors = checks.some((c) => c.status === "error");
        const totalCheck = checks.find((c) => c.name === "Total formula equals 100%");
        const isNot100 = totalCheck && totalCheck.status !== "success";

        if (hasErrors || isNot100) {
          const errorDetails = checks
            .filter(
              (c) =>
                c.status === "error" ||
                (c.name === "Total formula equals 100%" && c.status !== "success")
            )
            .map((c) => c.message)
            .join(" | ");

          throw new BadRequestException(
            `Formula validation failed: ${errorDetails || "Ensure total formula is exactly 100% and safety limits are met."}`
          );
        }

        // 3. Recalculate weights if phases or batch size changed
        const batchSize = data.targetBatchSize ?? existing.targetBatchSize;
        const unit = data.measurementUnit ?? existing.measurementUnit;

        const batchResult = calculateBatchWeights({
          batchSizeValue: batchSize,
          batchSizeUnit: unit,
          phases: phases as any,
        });

        phases = (phases || []).map((phase, i) => ({
          ...phase,
          ingredients: (phase.ingredients || []).map((ing, j) => ({
            ...ing,
            calculatedWeight: batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
          })),
        })) as any;
      }
    } else if (
      (data.targetBatchSize != null || data.measurementUnit != null) &&
      existing.phases.length > 0
    ) {
      const batchSize = data.targetBatchSize ?? existing.targetBatchSize;
      const unit = data.measurementUnit ?? existing.measurementUnit;

      const batchResult = calculateBatchWeights({
        batchSizeValue: batchSize,
        batchSizeUnit: unit,
        phases: existing.phases as any,
      });

      phases = existing.phases.map((phase, i) => ({
        ...(phase.phaseId ? { phaseId: phase.phaseId.toString() } : {}),
        phaseName: phase.phaseName,
        ingredients: phase.ingredients.map((ing, j) => ({
          ingredientId: ing.ingredientId.toString(),
          targetPercentage: ing.targetPercentage,
          calculatedWeight: batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
        })),
      })) as any;
    }

    const updatePayload = stripUndefined({
      ...data,
      ...(phases !== undefined ? { phases } : {}),
    } as any);

    const formula = await formulaModel.findOneAndUpdate(
      filter,
      updatePayload,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Formula updated successfully",
      formula,
    });
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const { status } = validation.updateFormulaStatusSchema.parse(req.body);
    const filter = this.getOwnershipFilter(id, req);

    const formula = await formulaModel.findOneAndUpdate(
      filter,
      { status },
      { new: true }
    );

    if (!formula) {
      throw new BadRequestException("Formula not found or you do not have permission");
    }

    res.status(200).json({
      message: "Formula status updated successfully",
      formula,
    });
  };

  validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const filter = this.getOwnershipFilter(id, req);

    const formula = await formulaModel.findOne(filter).lean();
    if (!formula) {
      throw new BadRequestException("Formula not found or you do not have permission");
    }

    const checks = await validateFormula(
      {
        targetpHMin: formula.targetpHMin ?? undefined,
        targetpHMax: formula.targetpHMax ?? undefined,
        phases: formula.phases.map((p) => ({
          phaseName: p.phaseName,
          ingredients: (p.ingredients || []).map((i) => ({
            ingredientId: i.ingredientId.toString(),
            targetPercentage: i.targetPercentage,
          })),
        })),
      },
      formula.templateId?.toString()
    );

    res.status(200).json({
      message: "Validation completed",
      checks,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const filter = this.getOwnershipFilter(id, req);

    const formula = await formulaModel.findOneAndDelete(filter);
    if (!formula) {
      throw new BadRequestException("Formula not found or you do not have permission");
    }

    res.status(200).json({
      message: "Formula deleted successfully",
    });
  };
}

export const formulaService = new FormulaService();
