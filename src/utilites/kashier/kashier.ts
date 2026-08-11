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
    let secretKey = process.env.KASHIER_SECRET_KEY || "";
    // تنظيف المفتاح من أي مسافات أو علامات تنصيص مخفية
    secretKey = secretKey.replace(/[\r\n\s"']/g, "").trim();

    if (!secretKey || !signature) return false;

    const data = payload?.data;
    if (!data || !Array.isArray(data.signatureKeys)) {
      console.error("[Kashier] Missing data.signatureKeys in payload");
      return false;
    }

    // بناء الـ Query String من البيانات اللي باعتها كاشير
    const queryString = data.signatureKeys
      .map((key: string) => `${key}=${data[key]}`)
      .join("&");

    // 🎯 الرابط المطابق تماماً للي أنت حاطه في لوحة تحكم كاشير في الصورة
    const exactKashierUrl = `https://your-brand-formulator.duckdns.org/api/payments/webhook?${queryString}`;

    // حساب التشفير
    const calculated = crypto
      .createHmac("sha256", secretKey)
      .update(exactKashierUrl)
      .digest("hex");

    console.log(`[Kashier Debug] Hashed URL: ${exactKashierUrl}`);
    console.log(`[Kashier Debug] Calculated: ${calculated}`);
    console.log(`[Kashier Debug] Received:   ${signature}`);

    const isMatch = calculated.toLowerCase() === signature.toLowerCase();
    
    if (isMatch) {
      console.log("✅ SUCCESS! Kashier Webhook signature verified successfully.");
      return true;
    } else {
      console.log("❌ Signature mismatch! Please ensure you used the 'Webhook Secret Key' from Kashier in your .env file.");
      return false;
    }
  } catch (error) {
    console.error("[Kashier] Error verifying webhook signature:", error);
    return false;
  }
}