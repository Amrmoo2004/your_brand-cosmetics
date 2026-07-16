import { Request, Response, NextFunction } from "express";
import { formulaModel } from "../DB/models/formula.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import { calculateBatchWeights } from "../../services/batchCalculation.service.js";
import { validateFormula } from "../../services/autoValidation.service.js";
import * as validation from "./formula.validation.js";

class FormulaService {
  constructor() {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createFormulaSchema.parse(req.body);
    const userId = (req as any).user._id;

    // Calculate weights if phases with ingredients exist
    let phases = data.phases;
    if (phases.length > 0 && data.targetBatchSize > 0) {
      const batchResult = calculateBatchWeights({
        batchSizeValue: data.targetBatchSize,
        batchSizeUnit: data.measurementUnit,
        phases: phases as any,
      });

      phases = phases.map((phase, i) => ({
        ...phase,
        ingredients: phase.ingredients.map((ing, j) => ({
          ...ing,
          calculatedWeight: batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
        })),
      }));
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
    const clonedPhases = template.phases.map(p => ({
      phaseId: p.phaseId,
      ingredients: [] // User will fill these in via update
    }));

    const formula = await formulaModel.create({
      formulaName: `${template.templateName} (My Copy)`,
      category: template.category,
      formulaType: template.formulaType,
      templateId: template._id,
      phases: clonedPhases,
      createdBy: userId,
      status: "Draft",
      targetBatchSize: 1 // Default
    });

    res.status(201).json({
      message: "Formula cloned from template successfully",
      formula,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;

    const formulas = await formulaModel
      .find({ createdBy: userId })
      .select("formulaName category status formulaType createdAt updatedAt")
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

    const formula = await formulaModel.findById(id).lean();
    if (!formula) {
      throw new BadRequestException("Formula not found");
    }

    res.status(200).json({
      message: "Formula retrieved successfully",
      formula,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);
    const data = validation.updateFormulaSchema.parse(req.body);

    const existing = await formulaModel.findById(id);
    if (!existing) {
      throw new BadRequestException("Formula not found");
    }

    // Recalculate weights if phases or batch size changed
    if (data.phases && data.phases.length > 0) {
      const batchSize = data.targetBatchSize ?? existing.targetBatchSize;
      const unit = data.measurementUnit ?? existing.measurementUnit;

      const batchResult = calculateBatchWeights({
        batchSizeValue: batchSize,
        batchSizeUnit: unit,
        phases: data.phases as any,
      });

      data.phases = data.phases.map((phase, i) => ({
        ...phase,
        ingredients: phase.ingredients.map((ing, j) => ({
          ...ing,
          calculatedWeight: batchResult.phases[i]?.ingredients[j]?.calculatedWeight ?? 0,
        })),
      }));
    }

    const formula = await formulaModel.findByIdAndUpdate(
      id,
      stripUndefined(data as any),
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

    const formula = await formulaModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!formula) {
      throw new BadRequestException("Formula not found");
    }

    res.status(200).json({
      message: "Formula status updated successfully",
      formula,
    });
  };

  validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);

    const formula = await formulaModel.findById(id).lean();
    if (!formula) {
      throw new BadRequestException("Formula not found");
    }

    const checks = await validateFormula({
      targetpHMin: formula.targetpHMin ?? undefined,
      targetpHMax: formula.targetpHMax ?? undefined,
      phases: formula.phases.map((p) => ({
        phaseName: p.phaseName,
        ingredients: p.ingredients.map((i) => ({
          ingredientId: i.ingredientId.toString(),
          targetPercentage: i.targetPercentage,
        })),
      })),
    });

    res.status(200).json({
      message: "Validation completed",
      checks,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.formulaIdParamSchema.parse(req.params);

    const formula = await formulaModel.findByIdAndDelete(id);
    if (!formula) {
      throw new BadRequestException("Formula not found");
    }

    res.status(200).json({
      message: "Formula deleted successfully",
    });
  };
}

export const formulaService = new FormulaService();
