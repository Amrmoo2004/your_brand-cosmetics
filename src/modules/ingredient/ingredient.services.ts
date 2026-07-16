import { Request, Response, NextFunction } from "express";
import { ingredientModel } from "../DB/models/ingredient.model.js";
import { ingredientCategoryModel } from "../DB/models/ingredientCategory.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import * as validation from "./ingredient.validation.js";

class IngredientService {
  constructor() {}

  private generateInternalCode = async (): Promise<string> => {
    const lastIngredient = await ingredientModel
      .findOne()
      .sort({ createdAt: -1 })
      .select("internalCode")
      .lean();

    let nextNumber = 1;
    if (lastIngredient?.internalCode) {
      const match = lastIngredient.internalCode.match(/ING-(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `ING-${String(nextNumber).padStart(5, "0")}`;
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createIngredientSchema.parse(req.body);
    const userId = (req as any).user._id;

    const categoryExists = await ingredientCategoryModel.findById(data.categoryId);
    if (!categoryExists) {
      throw new BadRequestException("Category not found");
    }

    const internalCode = await this.generateInternalCode();

    const ingredient = await ingredientModel.create(
      stripUndefined({ ...data, internalCode, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Ingredient created successfully",
      ingredient,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const query = validation.ingredientQuerySchema.parse(req.query);
    const filter: any = {};

    // Text search
    if (query.q) {
      filter.$text = { $search: query.q };
    }

    // Category filter
    if (query.category) {
      filter.categoryId = query.category;
    }

    // Origin source filter
    if (query.originSource) {
      filter.originSource = query.originSource;
    }

    // Compatibility score filter
    if (query.compatibility != null) {
      filter.compatibilityScore = { $gte: query.compatibility };
    }

    // Certifications filter
    if (query.certification && query.certification.length > 0) {
      filter.certifications = { $all: query.certification };
    }

    const skip = (query.page - 1) * query.limit;

    const [ingredients, total] = await Promise.all([
      ingredientModel
        .find(filter)
        .populate("categoryId", "name code iconEnum")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      ingredientModel.countDocuments(filter),
    ]);

    res.status(200).json({
      message: "Ingredients retrieved successfully",
      count: ingredients.length,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
      ingredients,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.ingredientIdParamSchema.parse(req.params);

    const ingredient = await ingredientModel
      .findById(id)
      .populate("categoryId", "name code iconEnum")
      .lean();

    if (!ingredient) {
      throw new BadRequestException("Ingredient not found");
    }

    res.status(200).json({
      message: "Ingredient retrieved successfully",
      ingredient,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.ingredientIdParamSchema.parse(req.params);
    const data = validation.updateIngredientSchema.parse(req.body);

    if (data.categoryId) {
      const categoryExists = await ingredientCategoryModel.findById(data.categoryId);
      if (!categoryExists) {
        throw new BadRequestException("Category not found");
      }
    }

    const ingredient = await ingredientModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!ingredient) {
      throw new BadRequestException("Ingredient not found");
    }

    res.status(200).json({
      message: "Ingredient updated successfully",
      ingredient,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.ingredientIdParamSchema.parse(req.params);

    const ingredient = await ingredientModel.findByIdAndDelete(id);
    if (!ingredient) {
      throw new BadRequestException("Ingredient not found");
    }

    res.status(200).json({
      message: "Ingredient deleted successfully",
    });
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const [total, active, natural, recentlyAdded] = await Promise.all([
      ingredientModel.countDocuments(),
      ingredientModel.countDocuments({ "usageGuidelines.minPercentage": { $gt: 0 } }),
      ingredientModel.countDocuments({ originSource: "Natural Origin" }),
      ingredientModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.status(200).json({
      message: "Ingredient stats retrieved successfully",
      stats: { total, active, natural, recentlyAdded },
    });
  };
}

export const ingredientService = new IngredientService();
