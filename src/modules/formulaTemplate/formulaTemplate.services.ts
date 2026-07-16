import { Request, Response, NextFunction } from "express";
import { formulaTemplateModel } from "../DB/models/formulaTemplate.model.js";
import { userModel } from "../DB/models/user.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import * as validation from "./formulaTemplate.validation.js";

class FormulaTemplateService {
  constructor() {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createTemplateSchema.parse(req.body);
    const userId = (req as any).user._id;

    const template = await formulaTemplateModel.create(
      stripUndefined({ ...data, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Formula Template created successfully",
      template,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userRole = (req as any).user.role;
    const userId = (req as any).user._id;

    let filter = {};

    // If user is not admin, only show templates from packages they purchased
    if (userRole !== "admin") {
      const user = await userModel.findById(userId).lean();
      const purchasedPackages = user?.purchasedPackages || [];
      filter = { packageId: { $in: purchasedPackages }, activeStatus: true };
    }

    const templates = await formulaTemplateModel
      .find(filter)
      .populate("packageId", "name")
      .populate("phases.phaseId", "name assignedCategories")
      .lean();

    res.status(200).json({
      message: "Formula Templates retrieved successfully",
      count: templates.length,
      templates,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.templateIdParamSchema.parse(req.params);
    const userRole = (req as any).user.role;
    const userId = (req as any).user._id;

    const template = await formulaTemplateModel
      .findById(id)
      .populate("packageId", "name")
      .populate("phases.phaseId", "name assignedCategories")
      .lean();

    if (!template) {
      throw new BadRequestException("Formula Template not found");
    }

    // Check access for regular users
    if (userRole !== "admin") {
      const user = await userModel.findById(userId).lean();
      const purchasedPackages = user?.purchasedPackages.map(String) || [];
      if (!purchasedPackages.includes(String(template.packageId._id))) {
        throw new BadRequestException("You have not purchased access to this template");
      }
    }

    res.status(200).json({
      message: "Formula Template retrieved successfully",
      template,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.templateIdParamSchema.parse(req.params);
    const data = validation.updateTemplateSchema.parse(req.body);

    const template = await formulaTemplateModel.findByIdAndUpdate(
      id,
      stripUndefined(data as any),
      { new: true, runValidators: true }
    );

    if (!template) {
      throw new BadRequestException("Formula Template not found");
    }

    res.status(200).json({
      message: "Formula Template updated successfully",
      template,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.templateIdParamSchema.parse(req.params);

    const template = await formulaTemplateModel.findByIdAndDelete(id);
    if (!template) {
      throw new BadRequestException("Formula Template not found");
    }

    res.status(200).json({
      message: "Formula Template deleted successfully",
    });
  };
}

export const formulaTemplateService = new FormulaTemplateService();
