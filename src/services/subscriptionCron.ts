import cron from "node-cron";
import { userModel } from "../modules/DB/models/user.model.js";

/**
 * Subscription Expiry Cron Job
 *
 * Runs daily at midnight (00:00) to mark expired subscriptions.
 * This is a cleanup/safety net — the real-time check is done
 * in the `requireActiveSubscription` middleware.
 *
 * What it does:
 * 1. Finds all users where planStatus is "active" but subscriptionEndDate < now
 * 2. Updates their planStatus to "expired"
 * 3. Logs the count of expired subscriptions
 */
export const startSubscriptionCron = (): void => {
  // Run every day at 00:00 (midnight)
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();

      const result = await userModel.updateMany(
        {
          planStatus: "active",
          subscriptionEndDate: { $lt: now },
        },
        {
          $set: { planStatus: "expired" },
        }
      );

      const expiredCount = result.modifiedCount;

      if (expiredCount > 0) {
        console.log(
          `[Subscription Cron] ⏰ Marked ${expiredCount} subscription(s) as expired at ${now.toISOString()}`
        );
      }
    } catch (error) {
      console.error("[Subscription Cron] ❌ Error running expiry check:", error);
    }
  });

  console.log("[Subscription Cron] 🕐 Cron job scheduled — runs daily at midnight");
};
