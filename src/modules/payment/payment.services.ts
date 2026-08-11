import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { subscriptionPackageModel } from "../DB/models/subscriptionPackage.model.js";
import { orderModel } from "../DB/models/order.model.js";
import { userModel } from "../DB/models/user.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { generateKashierHash, verifyKashierWebhook } from "../../utilites/kashier/kashier.js";
import { encrypt } from "../../utilites/crypto/enc.js";
import { decrypt } from "../../utilites/crypto/dec.js";
import * as validation from "./payment.validation.js";

class PaymentService {
  constructor() {}

  /**
   * Step 1: Create checkout session
   * - Validates the package
   * - Generates a unique order ID
   * - Computes HMAC hash for Kashier
   * - Saves a pending order in DB
   * - Returns checkout URL for the frontend to redirect the user
   */
  createCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { packageId } = validation.createCheckoutSchema.parse(req.body);
    const userId = (req as any).user._id;

    // 1. Validate package exists and is active
    const subscriptionPackage = await subscriptionPackageModel.findById(packageId).lean();
    if (!subscriptionPackage) {
      throw new BadRequestException("Subscription package not found");
    }
    if (!subscriptionPackage.activeStatus) {
      throw new BadRequestException("This subscription package is currently unavailable");
    }

    // 2. Check if user already purchased this package (prevent double purchase)
    const user = await userModel.findById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const alreadyPurchased = user.purchasedPackages.some(
      (pkg) => pkg.toString() === packageId
    );
    if (alreadyPurchased) {
      throw new BadRequestException("You have already purchased this package");
    }

    // 3. Generate unique merchant order ID
    const kashierOrderId = `ORD-${crypto.randomUUID()}`;

    // 4. Get Kashier credentials from env
    const merchantId = process.env.KASHIER_MERCHANT_ID;
    const apiKey = process.env.KASHIER_API_KEY;
    const mode = process.env.KASHIER_MODE || "test";
    const redirectUrl = process.env.KASHIER_REDIRECT_URL;

    if (!merchantId || !apiKey || !redirectUrl) {
      throw new BadRequestException("Payment gateway is not configured properly");
    }

    const amount = subscriptionPackage.price.toFixed(2);
    const currency = subscriptionPackage.currency || "EGP";

    // 5. Generate HMAC hash for Kashier
    const hash = generateKashierHash(
      {
        merchantId,
        orderId: kashierOrderId,
        amount,
        currency,
      },
      apiKey
    );

    // 6. Save order in DB as pending
    const order = await orderModel.create({
      userId,
      packageId,
      kashierOrderId,
      amount: subscriptionPackage.price,
      currency,
      status: "pending",
    });

    // 7. Build Kashier checkout URL
    const baseUrl =
      mode === "live"
        ? "https://checkout.kashier.io"
        : "https://checkout.kashier.io";

    const checkoutUrl = `${baseUrl}/?merchantId=${merchantId}&orderId=${kashierOrderId}&amount=${amount}&currency=${currency}&hash=${hash}&merchantRedirect=${encodeURIComponent(redirectUrl)}&mode=${mode}&display=en`;

    res.status(200).json({
      message: "Checkout session created successfully",
      checkoutUrl,
      orderId: order._id,
      kashierOrderId,
    });
  };

  /**
   * Step 2: Handle Kashier webhook callback
   * - Verifies HMAC signature (prevents tampering)
   * - Updates order status in DB
   * - Activates purchased package for the user
   * - Saves card token (encrypted) for future renewals
   * - Sets subscription end date based on package duration
   *
   * CRITICAL: This endpoint must NOT have auth middleware.
   * Kashier calls it server-to-server.
   */
  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const secretKey = process.env.KASHIER_SECRET_KEY;

      if (!secretKey) {
        console.error("[Kashier Webhook] KASHIER_SECRET_KEY is not configured");
        res.status(500).json({ message: "Payment webhook not configured" });
        return;
      }

      // 1. Verify HMAC signature using Kashier's signatureKeys-based algorithm
      // Kashier sends the signature in the x-kashier-signature header
      const receivedSignature =
        (req.headers["x-kashier-signature"] as string) ||
        (req.query.signature as string) ||
        (req.body?.data?.hash as string) ||
        (req.body?.hash as string);

      if (receivedSignature) {
        const isValid = verifyKashierWebhook(req.body, receivedSignature);
        if (!isValid) {
          console.error("[Kashier Webhook] Invalid HMAC signature — possible tampering");
          res.status(403).json({ message: "Invalid signature" });
          return;
        }
      }

      // 2. Extract data from webhook body — Kashier nests fields inside req.body.data
      const webhookData = req.body?.data ?? req.body;
      const {
        merchantOrderId,
        transactionId,
        orderStatus,
        paymentStatus,
        status,
        cardToken,
        cardLastFour,
        cardBrand,
        paymentMethod,
        method,
      } = webhookData;

      // Support both "status" (new format) and "orderStatus/paymentStatus" (old format)
      const resolvedOrderStatus  = orderStatus  ?? status;
      const resolvedPaymentStatus = paymentStatus ?? status;

      if (!merchantOrderId) {
        console.error("[Kashier Webhook] Missing merchantOrderId in payload");
        res.status(400).json({ message: "Missing merchantOrderId" });
        return;
      }

      // 3. Find the order in our DB
      const order = await orderModel.findOne({ kashierOrderId: merchantOrderId });
      if (!order) {
        console.error(`[Kashier Webhook] Order not found: ${merchantOrderId}`);
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // 4. Idempotency — if already paid, don't process again
      if (order.status === "paid") {
        console.log(`[Kashier Webhook] Order ${merchantOrderId} already paid — skipping`);
        res.status(200).json({ message: "Already processed" });
        return;
      }


      // 5. Determine payment status
      const isSuccess =
        resolvedOrderStatus === "SUCCESS" ||
        resolvedOrderStatus === "CAPTURED" ||
        resolvedPaymentStatus === "SUCCESS" ||
        resolvedPaymentStatus === "CAPTURED";

      if (isSuccess) {
        // Update order to paid
        order.status = "paid";
        order.transactionId = transactionId || undefined;
        order.paymentMethod = paymentMethod || method || undefined;
        order.paidAt = new Date();

        // Save card token on order if provided
        if (cardToken) {
          order.cardToken = cardToken;
        }

        await order.save();

        // 6. Fetch the package to get durationDays
        const subscriptionPackage = await subscriptionPackageModel
          .findById(order.packageId)
          .lean();

        const durationDays = subscriptionPackage?.durationDays || 365;

        // 7. Calculate subscription end date
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setDate(subscriptionEndDate.getDate() + durationDays);

        // 8. Build the user update object
        const userUpdate: Record<string, unknown> = {
          $addToSet: { purchasedPackages: order.packageId },
          $set: {
            planStatus: "active",
            subscriptionEndDate,
          },
        };

        // 9. Save card token on user (encrypted) if provided — for future renewals
        if (cardToken) {
          (userUpdate.$set as Record<string, unknown>).cardToken = encrypt(cardToken);

          if (cardLastFour) {
            (userUpdate.$set as Record<string, unknown>).cardLastFour = cardLastFour;
          }
          if (cardBrand) {
            (userUpdate.$set as Record<string, unknown>).cardBrand = cardBrand;
          }
        }

        await userModel.findByIdAndUpdate(order.userId, userUpdate);

        console.log(
          `[Kashier Webhook] ✅ Payment SUCCESS — Order: ${merchantOrderId}, User: ${order.userId}, Package: ${order.packageId}, Expires: ${subscriptionEndDate.toISOString()}`
        );
      } else {
        // Payment failed
        order.status = "failed";
        order.transactionId = transactionId || undefined;
        order.paymentMethod = paymentMethod || undefined;
        await order.save();

        console.log(
          `[Kashier Webhook] ❌ Payment FAILED — Order: ${merchantOrderId}, Status: ${orderStatus || paymentStatus}`
        );
      }

      // 10. Always respond 200 to Kashier (so it doesn't retry)
      res.status(200).json({ message: "Webhook received" });
    } catch (error) {
      console.error("[Kashier Webhook] Unexpected error:", error);
      // Still respond 200 to prevent Kashier from retrying on server errors
      res.status(200).json({ message: "Webhook received" });
    }
  };

  /**
   * Renew subscription using saved card token
   * - Decrypts the saved card token
   * - Sends a charge request to Kashier API with the token
   * - Creates a new order (will be confirmed by webhook)
   */
  renewWithToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;
    const user = await userModel.findById(userId);

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (!user.cardToken) {
      throw new BadRequestException(
        "No saved card found. Please make a new payment to save your card."
      );
    }

    // Find the user's last purchased package to renew
    const lastOrder = await orderModel
      .findOne({ userId, status: "paid" } as any)
      .sort({ paidAt: -1 })
      .lean();

    if (!lastOrder) {
      throw new BadRequestException("No previous subscription found to renew");
    }

    const subscriptionPackage = await subscriptionPackageModel
      .findById(lastOrder.packageId)
      .lean();

    if (!subscriptionPackage) {
      throw new BadRequestException("Original subscription package no longer exists");
    }

    if (!subscriptionPackage.activeStatus) {
      throw new BadRequestException("This subscription package is currently unavailable");
    }

    // Get Kashier credentials
    const merchantId = process.env.KASHIER_MERCHANT_ID;
    const apiKey = process.env.KASHIER_API_KEY;
    const redirectUrl = process.env.KASHIER_REDIRECT_URL;

    if (!merchantId || !apiKey || !redirectUrl) {
      throw new BadRequestException("Payment gateway is not configured properly");
    }

    // Decrypt the saved card token
    const decryptedToken = decrypt(user.cardToken);

    // Generate new order ID for the renewal
    const kashierOrderId = `RNW-${crypto.randomUUID()}`;
    const amount = subscriptionPackage.price.toFixed(2);
    const currency = subscriptionPackage.currency || "EGP";

    // Create a pending renewal order
    const order = await orderModel.create({
      userId,
      packageId: lastOrder.packageId,
      kashierOrderId,
      amount: subscriptionPackage.price,
      currency,
      status: "pending",
      paymentMethod: "card_token",
      cardToken: decryptedToken,
    });

    // Build Kashier token charge URL
    // Note: The actual Kashier token-charge API endpoint and format should be
    // confirmed from your Kashier dashboard documentation.
    const hash = generateKashierHash(
      { merchantId, orderId: kashierOrderId, amount, currency },
      apiKey
    );

    const chargeUrl = `https://checkout.kashier.io/?merchantId=${merchantId}&orderId=${kashierOrderId}&amount=${amount}&currency=${currency}&hash=${hash}&merchantRedirect=${encodeURIComponent(redirectUrl)}&cardToken=${encodeURIComponent(decryptedToken)}&mode=${process.env.KASHIER_MODE || "test"}&display=en`;

    res.status(200).json({
      message: "Renewal checkout created successfully",
      checkoutUrl: chargeUrl,
      orderId: order._id,
      kashierOrderId,
      package: {
        name: subscriptionPackage.name,
        price: subscriptionPackage.price,
        currency: subscriptionPackage.currency,
        durationDays: subscriptionPackage.durationDays,
      },
    });
  };

  /**
   * Get user's payment orders history
   */
  getMyOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;

    const orders = await orderModel
      .find({ userId })
      .populate("packageId", "name description price currency durationDays")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "Orders retrieved successfully",
      count: orders.length,
      orders,
    });
  };

  /**
   * Get a specific order by ID (user can only see their own)
   */
  getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;
    const orderId = req.params.orderId;

    if (!orderId) {
      throw new BadRequestException("Order ID is required");
    }

    const order = await orderModel
      .findOne({ _id: orderId, userId } as any)
      .populate("packageId", "name description price currency durationDays")
      .lean();

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  };

  /**
   * Get user's subscription status
   */
  getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user._id;

    const user = await userModel
      .findById(userId)
      .select("planStatus subscriptionEndDate cardLastFour cardBrand purchasedPackages")
      .populate("purchasedPackages", "name price currency durationDays")
      .lean();

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const now = new Date();
    const isExpired = user.subscriptionEndDate
      ? now > new Date(user.subscriptionEndDate)
      : false;

    res.status(200).json({
      message: "Subscription status retrieved successfully",
      subscription: {
        planStatus: isExpired ? "expired" : user.planStatus,
        subscriptionEndDate: user.subscriptionEndDate || null,
        isExpired,
        daysRemaining: user.subscriptionEndDate
          ? Math.max(0, Math.ceil((new Date(user.subscriptionEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0,
        hasSavedCard: !!user.cardLastFour,
        cardLastFour: user.cardLastFour || null,
        cardBrand: user.cardBrand || null,
        purchasedPackages: user.purchasedPackages,
      },
    });
  };
}

export const paymentService = new PaymentService();
