import { Request, Response, NextFunction } from "express";
import { subscriptionPackageModel } from "../DB/models/subscriptionPackage.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import * as validation from "./subscriptionPackage.validation.js";

class SubscriptionPackageService {
  constructor() {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createPackageSchema.parse(req.body);
    const userId = (req as any).user._id;

    const subscriptionPackage = await subscriptionPackageModel.create(
      stripUndefined({ ...data, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Subscription Package created successfully",
      subscriptionPackage,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const packages = await subscriptionPackageModel
      .find()
      .sort({ price: 1 })
      .lean();

    res.status(200).json({
      message: "Subscription Packages retrieved successfully",
      count: packages.length,
      packages,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.packageIdParamSchema.parse(req.params);

    const subscriptionPackage = await subscriptionPackageModel.findById(id).lean();
    if (!subscriptionPackage) {
      throw new BadRequestException("Subscription Package not found");
    }

    res.status(200).json({
      message: "Subscription Package retrieved successfully",
      subscriptionPackage,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.packageIdParamSchema.parse(req.params);
    const data = validation.updatePackageSchema.parse(req.body);

    const subscriptionPackage = await subscriptionPackageModel.findByIdAndUpdate(
      id,
      stripUndefined(data as any),
      { new: true, runValidators: true }
    );

    if (!subscriptionPackage) {
      throw new BadRequestException("Subscription Package not found");
    }

    res.status(200).json({
      message: "Subscription Package updated successfully",
      subscriptionPackage,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.packageIdParamSchema.parse(req.params);

    const subscriptionPackage = await subscriptionPackageModel.findByIdAndDelete(id);
    if (!subscriptionPackage) {
      throw new BadRequestException("Subscription Package not found");
    }

    res.status(200).json({
      message: "Subscription Package deleted successfully",
    });
  };
}

export const subscriptionPackageService = new SubscriptionPackageService();
