import { z } from "zod";
import { CATEGORY_ICONS } from "../DB/models/ingredientCategory.model.js";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(50),
  code: z
    .string()
    .min(1, "Category code is required")
    .max(10)
    .transform((val) => val.toUpperCase()),
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  iconEnum: z.enum(CATEGORY_ICONS).optional().default("Water"),
  isMinAllowed: z.boolean().optional().default(false),
  isMaxAllowed: z.boolean().optional().default(false),
  isRequiredFormula: z.boolean().optional().default(false),
  isAutoValidationEnabled: z.boolean().optional().default(false),
  activeStatus: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().length(24, "Invalid category ID"),
});
