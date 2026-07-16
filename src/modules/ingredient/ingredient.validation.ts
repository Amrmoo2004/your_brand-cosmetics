import { z } from "zod";
import {
  SOLUBILITY_OPTIONS,
  ORIGIN_SOURCE_OPTIONS,
  CERTIFICATION_OPTIONS,
} from "../DB/models/ingredient.model.js";

const usageGuidelinesSchema = z.object({
  minPercentage: z.number().min(0).max(100).optional().default(0),
  maxPercentage: z.number().min(0).max(100).optional().default(100),
  defaultPercentage: z.number().min(0).max(100).optional().default(1),
  pHMin: z.number().min(0).max(14).optional().default(0),
  pHMax: z.number().min(0).max(14).optional().default(14),
  tempStabilityValue: z.number().optional().default(25),
  solubility: z.enum(SOLUBILITY_OPTIONS).optional().default("Water Soluble"),
});

export const createIngredientSchema = z.object({
  commercialName: z.string().min(2, "Commercial name is required").max(200),
  inciName: z.string().min(2, "INCI name is required").max(200),
  categoryId: z.string().length(24, "Invalid category ID"),
  supplier: z.string().max(200).optional(),
  brand: z.string().max(200).optional(),
  primaryFunction: z.string().max(500).optional(),
  technicalDescription: z.string().max(2000).optional(),
  keyBenefits: z.array(z.string().max(100)).optional().default([]),
  usageGuidelines: usageGuidelinesSchema.optional(),
  originSource: z.enum(ORIGIN_SOURCE_OPTIONS).optional(),
  compatibilityScore: z.number().min(0).max(100).optional().default(100),
  certifications: z.array(z.enum(CERTIFICATION_OPTIONS)).optional().default([]),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const ingredientIdParamSchema = z.object({
  id: z.string().length(24, "Invalid ingredient ID"),
});

export const ingredientQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  originSource: z.enum(ORIGIN_SOURCE_OPTIONS).optional(),
  compatibility: z.coerce.number().min(0).max(100).optional(),
  certification: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => (typeof val === "string" ? [val] : val)),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(15),
});
