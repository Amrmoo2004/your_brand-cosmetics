import { Request, Response, NextFunction } from "express";
import { ingredientCategoryModel } from "../DB/models/ingredientCategory.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { stripUndefined } from "../../utilites/helpers/stripUndefined.js";
import * as validation from "./ingredientCategory.validation.js";

class IngredientCategoryService {
  constructor() {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.createCategorySchema.parse(req.body);
    const userId = (req as any).user._id;

    const existing = await ingredientCategoryModel.findOne({ code: data.code });
    if (existing) {
      throw new BadRequestException(`Category with code "${data.code}" already exists`);
    }

    const category = await ingredientCategoryModel.create(
      stripUndefined({ ...data, createdBy: userId }) as any
    );

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { activeOnly } = req.query;

    const filter: any = {};
    if (activeOnly === "true") {
      filter.activeStatus = true;
    }

    const categories = await ingredientCategoryModel
      .find(filter)
      .sort({ displayOrder: 1 })
      .lean();

    res.status(200).json({
      message: "Categories retrieved successfully",
      count: categories.length,
      categories,
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.categoryIdParamSchema.parse(req.params);

    const category = await ingredientCategoryModel.findById(id).lean();
    if (!category) {
      throw new BadRequestException("Category not found");
    }

    res.status(200).json({
      message: "Category retrieved successfully",
      category,
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.categoryIdParamSchema.parse(req.params);
    const data = validation.updateCategorySchema.parse(req.body);

    if (data.code) {
      const existing = await ingredientCategoryModel.findOne({
        code: data.code,
        _id: { $ne: id },
      });
      if (existing) {
        throw new BadRequestException(`Category with code "${data.code}" already exists`);
      }
    }

    const category = await ingredientCategoryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = validation.categoryIdParamSchema.parse(req.params);

    const category = await ingredientCategoryModel.findByIdAndDelete(id);
    if (!category) {
      throw new BadRequestException("Category not found");
    }

    res.status(200).json({
      message: "Category deleted successfully",
    });
  };
}

export const ingredientCategoryService = new IngredientCategoryService();
