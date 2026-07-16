import { z } from "zod";
import { FORMULA_TYPE_OPTIONS } from "../DB/models/formula.model.js";

const templatePhaseSchema = z.object({
  phaseId: z.string().length(24, "Invalid phase ID"),
  phaseName: z.string().min(1),
  minPercentage: z.number().min(0).max(100).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
});

export const createTemplateSchema = z.object({
  templateName: z.string().min(2, "Template name is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  formulaType: z.enum(FORMULA_TYPE_OPTIONS),
  packageId: z.string().length(24, "Invalid package ID"),
  description: z.string().max(2000).optional(),
  phases: z.array(templatePhaseSchema).optional().default([]),
  methodSteps: z.array(z.string().min(1)).optional().default([]),
  activeStatus: z.boolean().optional().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateIdParamSchema = z.object({
  id: z.string().length(24, "Invalid template ID"),
});
