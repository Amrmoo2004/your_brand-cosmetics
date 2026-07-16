import { z } from "zod";

export const createPackageSchema = z.object({
  name: z.string().min(2, "Package name is required").max(100),
  description: z.string().min(5, "Description is required").max(1000),
  price: z.number().min(0, "Price must be positive"),
  currency: z.string().length(3).optional().default("USD"),
  features: z.array(z.string().min(1)).optional().default([]),
  activeStatus: z.boolean().optional().default(true),
});

export const updatePackageSchema = createPackageSchema.partial();

export const packageIdParamSchema = z.object({
  id: z.string().length(24, "Invalid package ID"),
});
