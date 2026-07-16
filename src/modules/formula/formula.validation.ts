import { z } from "zod";
import {
  FORMULA_STATUS_OPTIONS,
  FORMULA_TYPE_OPTIONS,
  MEASUREMENT_UNIT_OPTIONS,
  SHELF_LIFE_OPTIONS,
} from "../DB/models/formula.model.js";

const formulaIngredientSchema = z.object({
  ingredientId: z.string().length(24, "Invalid ingredient ID"),
  targetPercentage: z.number().min(0).max(100),
});

const formulaPhaseSchema = z.object({
  phaseId: z.string().length(24, "Invalid phase ID"),
  phaseName: z.string().min(1),
  ingredients: z.array(formulaIngredientSchema).optional().default([]),
});

export const createFormulaSchema = z.object({
  formulaName: z.string().min(2, "Formula name is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  productType: z.string().max(100).optional(),
  targetMarket: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  targetBatchSize: z.number().min(0, "Batch size must be positive"),
  measurementUnit: z.enum(MEASUREMENT_UNIT_OPTIONS).optional().default("kg"),
  formulaType: z.enum(FORMULA_TYPE_OPTIONS),
  preservationSystem: z.string().max(200).optional(),
  expectedShelfLife: z.enum(SHELF_LIFE_OPTIONS).optional(),
  methodology: z.string().max(200).optional(),
  regulatoryStandards: z.string().max(200).optional(),
  labLocation: z.string().max(200).optional(),
  targetpHMin: z.number().min(0).max(14).optional(),
  targetpHMax: z.number().min(0).max(14).optional(),
  phases: z.array(formulaPhaseSchema).optional().default([]),
});

export const updateFormulaSchema = createFormulaSchema.partial();

export const updateFormulaStatusSchema = z.object({
  status: z.enum(FORMULA_STATUS_OPTIONS),
});

export const formulaIdParamSchema = z.object({
  id: z.string().length(24, "Invalid formula ID"),
});
