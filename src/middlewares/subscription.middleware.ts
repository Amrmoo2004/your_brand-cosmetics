import { Request, Response, NextFunction } from "express";
import { BadRequestException } from "../utilites/response/response.js";

/**
 * Middleware: Require Active Subscription
 *
 * Checks if the authenticated user has an active, non-expired subscription.
 * - Admins bypass this check entirely.
 * - If planStatus is "none" → 403 (no subscription)
 * - If planStatus is "expired" or subscriptionEndDate < now → 403 (expired)
 * - If planStatus is "active" and subscriptionEndDate >= now → allow through
 *
 * Usage: Place AFTER `protect` middleware on content-access routes.
 */
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  // Admins bypass subscription check
  if (user.role === "admin") {
    return next();
  }

  // Check if user has any subscription at all
  if (!user.planStatus || user.planStatus === "none") {
    return next(
      new BadRequestException("No active subscription. Please subscribe to access this content.")
    );
  }

  // Check if subscription has expired
  if (user.planStatus === "expired") {
    return next(
      new BadRequestException("Your subscription has expired. Please renew to continue accessing content.")
    );
  }

  // Double-check the actual date (real-time check — cron is just a cleanup)
  if (user.subscriptionEndDate && new Date() > new Date(user.subscriptionEndDate)) {
    return next(
      new BadRequestException("Your subscription has expired. Please renew to continue accessing content.")
    );
  }

  // Subscription is active — allow through
  next();
};
