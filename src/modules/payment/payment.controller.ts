import { Router, raw } from "express";
import { paymentService } from "./payment.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./payment.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

// ── Protected Routes (require authentication) ─────────────────────────────

// Create checkout session — user must be logged in
router.post(
  "/checkout",
  protect,
  validation({ body: validations.createCheckoutSchema }),
  paymentService.createCheckout
);

// Renew subscription using saved card token
router.post(
  "/renew",
  protect,
  paymentService.renewWithToken
);

// Get subscription status (plan, expiry, saved card info)
router.get(
  "/subscription",
  protect,
  paymentService.getSubscriptionStatus
);

// Get my orders history
router.get(
  "/orders",
  protect,
  paymentService.getMyOrders
);

// Get a specific order by ID
router.get(
  "/orders/:orderId",
  protect,
  paymentService.getOrderById
);

// ── Webhook Route (NO auth — Kashier calls this server-to-server) ──────────
// Uses raw body parser to preserve the body for HMAC signature verification
router.post(
  "/webhook",
  raw({ type: "application/json" }),
  (req, _res, next) => {
    // Store raw body for HMAC verification, then parse JSON
    (req as any).rawBody = req.body;
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
    next();
  },
  paymentService.handleWebhook
);

export default router;
