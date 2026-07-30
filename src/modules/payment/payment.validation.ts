import { z } from "zod";

export const createCheckoutSchema = z.object({
  packageId: z.string().length(24, "Invalid package ID"),
});

// Kashier webhook payload validation (flexible to accept Kashier's callback structure)
export const kashierWebhookBodySchema = z.object({
  merchantOrderId: z.string().min(1),
  orderId: z.string().optional(),
  transactionId: z.string().optional(),
  orderStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  hash: z.string().optional(),
});
