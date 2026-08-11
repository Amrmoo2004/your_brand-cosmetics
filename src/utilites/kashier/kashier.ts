import crypto from "crypto";

/**
 * Generate HMAC-SHA256 hash for Kashier outgoing requests.
 * The hash is computed over concatenated order data using the API key.
 */
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
    .createHmac("sha256", apiKey.trim()) // تنظيف احتياطي
    .update(hashString)
    .digest("hex");
};

/**
 * Verify Kashier webhook signature (Auto-Detect Edition).
 */
export function verifyKashierWebhook(payload: any, signature: string): boolean {
  try {
    // 1. سحب المفتاحين وتنظيفهم بالكامل من أي مسافات أو علامات تنصيص
    const key1 = (process.env.KASHIER_SECRET_KEY || "").replace(/[\r\n\s"']/g, "").trim();
    const key2 = (process.env.KASHIER_API_KEY || "").replace(/[\r\n\s"']/g, "").trim();

    if (!signature) return false;

    const data = payload?.data;
    if (!data || !Array.isArray(data.signatureKeys)) {
      console.error("[Kashier] Missing data.signatureKeys in payload");
      return false;
    }

    // 2. بناء الـ Query String
    const queryString = data.signatureKeys
      .map((key: string) => `${key}=${data[key]}`)
      .join("&");

    // 3. بناء الرابط الكامل (بناءً على صورتك من لوحة كاشير)
    const exactKashierUrl = `https://your-brand-formulator.duckdns.org/api/payments/webhook?${queryString}`;

    // 4. تجهيز الاحتمالات للتجربة (الرابط كامل، والـ query لوحده)
    const stringsToTest = [exactKashierUrl, queryString];
    const keysToTest = [key1, key2]; 

    console.log("--- 🚀 KASHIER FINAL AUTO-DETECT VERIFICATION ---");
    
    // 5. اللوب الذكي: هيجرب كل المفاتيح مع كل أشكال الرابط
    for (const key of keysToTest) {
      if (!key) continue; // لو المفتاح فاضي يتجاهله
      
      for (const str of stringsToTest) {
        const hash = crypto.createHmac("sha256", key).update(str).digest("hex");
        
        // لو التشفير تطابق، يطبع التفاصيل ويقبل الريكويست
        if (hash.toLowerCase() === signature.toLowerCase()) {
          console.log(`✅ MATCH FOUND! 200 OK`);
          console.log(`🔑 Used Key: ${key === key1 ? "KASHIER_SECRET_KEY (الطويل)" : "KASHIER_API_KEY (UUID)"}`);
          console.log(`🔗 Used String: ${str === exactKashierUrl ? "Full URL (الرابط الكامل)" : "Query String Only (البيانات فقط)"}`);
          return true; // تم التحقق بنجاح
        }
      }
    }

    // لو كل المحاولات فشلت
    console.log("❌ All combinations failed. Signature mismatch!");
    return false;

  } catch (error) {
    console.error("[Kashier] Error verifying webhook signature:", error);
    return false;
  }
}