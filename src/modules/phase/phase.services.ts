import { Request, Response, NextFunction } from "express";
import { phaseModel } from "../DB/models/phase.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import * as validation from "./phase.validation.js";

class PhaseService {
  constructor() {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createPhaseSchema.parse(req.body);
    const userId = (req as any).user._id;

    const phase = await phaseModel.create(
      stripUndefined({ ...data, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Phase created successfully",
      phase,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const phases = await phaseModel
      .find()
      .populate("assignedCategories", "name code iconEnum")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "Phases retrieved successfully",
      count: phases.length,
      phases,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.phaseIdParamSchema.parse(req.params);

    const phase = await phaseModel
      .findById(id)
      .populate("assignedCategories", "name code iconEnum")
      .lean();

    if (!phase) {
      throw new BadRequestException("Phase not found");
    }

    res.status(200).json({
      message: "Phase retrieved successfully",
      phase,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.phaseIdParamSchema.parse(req.params);
    const data = validation.updatePhaseSchema.parse(req.body);

    const phase = await phaseModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!phase) {
      throw new BadRequestException("Phase not found");
    }

    res.status(200).json({
      message: "Phase updated successfully",
      phase,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.phaseIdParamSchema.parse(req.params);

    const phase = await phaseModel.findByIdAndDelete(id);
    if (!phase) {
      throw new BadRequestException("Phase not found");
    }

    res.status(200).json({
      message: "Phase deleted successfully",
    });
  };
}

export const phaseService = new PhaseService();
