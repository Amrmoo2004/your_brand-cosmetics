import { z } from "zod";
import { MBR_STATUS_OPTIONS, TIME_UNIT_OPTIONS } from "../DB/models/mbr.model.js";

const mbrIngredientSchema = z.object({
  ingredientId: z.string().length(24, "Invalid ingredient ID"),
  ingredientName: z.string().min(1),
  inciName: z.string().min(1),
  targetPercentage: z.number().min(0).max(100),
  calculatedWeight: z.number().min(0).optional().default(0),
  checked: z.boolean().optional().default(false),
});

const mbrPhaseSchema = z.object({
  phaseName: z.string().min(1),
  ingredients: z.array(mbrIngredientSchema).optional().default([]),
  subtotal: z.number().optional().default(0),
});

const productionStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  description: z.string().min(1, "Step description is required"),
  timeStarted: z.coerce.date().optional(),
  operatorInitials: z.string().max(10).optional(),
});

export const createMbrSchema = z.object({
  formulaId: z.string().length(24, "Invalid formula ID"),
  status: z.enum(MBR_STATUS_OPTIONS).optional().default("Draft"),
  batchSize: z.object({
    value: z.number().min(0),
    unit: z.string().default("kg"),
  }),
  targetpHMin: z.number().min(0).max(14).optional(),
  targetpHMax: z.number().min(0).max(14).optional(),
  estProductionTime: z
    .object({
      value: z.number().min(0).default(0),
      unit: z.enum(TIME_UNIT_OPTIONS).default("hrs"),
    })
    .optional(),
  phases: z.array(mbrPhaseSchema).optional().default([]),
  productionSteps: z.array(productionStepSchema).optional().default([]),
});

export const updateMbrSchema = z.object({
  status: z.enum(MBR_STATUS_OPTIONS).optional(),
  batchSize: z
    .object({
      value: z.number().min(0),
      unit: z.string().default("kg"),
    })
    .optional(),
  targetpHMin: z.number().min(0).max(14).optional(),
  targetpHMax: z.number().min(0).max(14).optional(),
  estProductionTime: z
    .object({
      value: z.number().min(0),
      unit: z.enum(TIME_UNIT_OPTIONS),
    })
    .optional(),
  phases: z.array(mbrPhaseSchema).optional(),
  productionSteps: z.array(productionStepSchema).optional(),
});

export const mbrIdParamSchema = z.object({
  id: z.string().length(24, "Invalid MBR ID"),
});
