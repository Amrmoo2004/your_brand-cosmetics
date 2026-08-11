import crypto from "crypto";

export const generateKashierHash = (
  data: {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
  },
  apiKey: string
): string => {
  const hashString = `${data.merchantId}.${data.orderId}.${data.amount}.${data.currency}`;
  return crypto
    .createHmac("sha256", apiKey.trim())
    .update(hashString)
    .digest("hex");
};

export function verifyKashierWebhook(payload: any, signature: string): boolean {
  try {
    // سحب المفاتيح اللي عندك وتنظيفها
    const key1 = (process.env.KASHIER_SECRET_KEY || "").replace(/[\r\n\s"']/g, "");
    const key2 = (process.env.KASHIER_API_KEY || "").replace(/[\r\n\s"']/g, "");

    if (!signature) return false;

    const data = payload?.data;
    if (!data || !Array.isArray(data.signatureKeys)) return false;

    // 1. الداتا العادية (بدون تحويل)
    const queryUnencoded = data.signatureKeys
      .map((k: string) => `${k}=${data[k]}`)
      .join("&");

    // 2. الداتا متحولة URL Encoded (عشان التواريخ اللي فيها T و Z)
    const queryEncoded = data.signatureKeys
      .map((k: string) => `${k}=${encodeURIComponent(String(data[k]))}`)
      .join("&");

    const exactUrl = `https://your-brand-formulator.duckdns.org/api/payments/webhook`;

    // تجميع كل الاحتمالات الممكنة للرابط
    const stringsToTest = [
      `${exactUrl}?${queryUnencoded}`,
      `${exactUrl}?${queryEncoded}`,
      `?${queryUnencoded}`,
      `?${queryEncoded}`,
      queryUnencoded,
      queryEncoded
    ];

    // تجميع كل الاحتمالات الممكنة للمفاتيح اللي في ملف env
    const keysToTest: string[] = [key1, key2];
    if (key1.includes("$")) {
      const parts = key1.split("$");
      if (parts[0]) keysToTest.push(parts[0]);
      if (parts[1]) keysToTest.push(parts[1]);
    }

    console.log("--- 🚀 KASHIER ULTIMATE MATRIX VERIFICATION ---");
    
    for (const key of keysToTest) {
      if (!key) continue;
      
      for (const str of stringsToTest) {
        const hash = crypto.createHmac("sha256", key).update(str).digest("hex");
        
        if (hash.toLowerCase() === signature.toLowerCase()) {
          console.log(`✅ MATCH FOUND!`);
          console.log(`🔑 Key Used length: ${key.length}`);
          console.log(`🔗 String Used: ${str}`);
          return true; // نجاح الريكويست!
        }
      }
    }

    console.log("❌ All combinations failed.");
    console.log("⚠️ المشكلة الآن 100% إنك لا تستخدم الـ Webhook Secret الصحيح.");
    console.log(">> ادخل لوحة Kashier -> Webhooks -> انسخ المفتاح الخاص بالـ Webhook وضفه في ملف .env!");
    return false;

  } catch (error) {
    console.error("[Kashier] Error verifying webhook signature:", error);
    return false;
  }
}