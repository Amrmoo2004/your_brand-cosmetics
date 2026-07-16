import { z } from "zod";

export const createPhaseSchema = z.object({
  name: z.string().min(2, "Phase name is required").max(100),
  code: z
    .string()
    .min(1, "Phase code is required")
    .max(10)
    .transform((val) => val.toUpperCase()),
  description: z.string().max(500).optional(),
  assignedCategories: z
    .array(z.string().length(24, "Invalid category ID"))
    .optional()
    .default([]),
});

export const updatePhaseSchema = createPhaseSchema.partial();

export const phaseIdParamSchema = z.object({
  id: z.string().length(24, "Invalid phase ID"),
});
