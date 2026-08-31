import { z } from "zod";
import { FORMULA_TYPE_OPTIONS } from "../DB/models/formula.model.js";
import {
  RULE_TYPE_OPTIONS,
  RULE_SEVERITY_OPTIONS,
} from "../DB/models/formulaTemplate.model.js";

const templatePhaseCategorySchema = z.object({
  categoryId: z.string().length(24, "Invalid category ID"),
  minItems: z.number().min(0).optional(),
  maxItems: z.number().min(1).optional(),
  minPercentage: z.number().min(0).max(100).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
  minPercentagePerItem: z.number().min(0).max(100),
  maxPercentagePerItem: z.number().min(0).max(100),
});

const templatePhaseSchema = z.object({
  phaseId: z.string().length(24, "Invalid phase ID"),
  phaseName: z.string().min(1),
  allowedCategories: z.array(templatePhaseCategorySchema).optional().default([]),
});

const compatibilityRuleZodSchema = z.object({
  ruleType: z.enum(RULE_TYPE_OPTIONS),
  conditionCategory: z.string().length(24, "Invalid category ID"),
  requiredCategory: z.string().length(24, "Invalid category ID").optional(),
  restrictedCategory: z.string().length(24, "Invalid category ID").optional(),
  requiredPhaseName: z.string().min(1).optional(),
  errorMessage: z.string().min(1, "Error message is required").max(500),
  severity: z.enum(RULE_SEVERITY_OPTIONS).default("error"),
});

export const createTemplateSchema = z.object({
  templateName: z.string().min(2, "Template name is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  formulaType: z.enum(FORMULA_TYPE_OPTIONS),
  packageId: z.string().length(24, "Invalid package ID"),
  description: z.string().max(2000).optional(),
  phases: z.array(templatePhaseSchema).optional().default([]),
  compatibilityRules: z.array(compatibilityRuleZodSchema).optional().default([]),
  methodSteps: z.array(z.string().min(1)).optional().default([]),
  activeStatus: z.boolean().optional().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateIdParamSchema = z.object({
  id: z.string().length(24, "Invalid template ID"),
});

