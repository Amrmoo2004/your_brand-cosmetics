import crypto from "crypto";

/**
 * Generate HMAC-SHA256 hash for Kashier outgoing requests.
 * The hash is computed over concatenated order data using the API key.
 *
 * Kashier hash format: HMAC-SHA256(mid.orderId.amount.currency, apiKey)
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
    .createHmac("sha256", apiKey)
    .update(hashString)
    .digest("hex");
};

/**
 * @param rawBody - The raw request body buffer
 * @param receivedSignature - The signature from Kashier's callback header/query
 * @param secretKey - Your Kashier secret key
 * @returns true if signature is valid
 */
export const verifyKashierWebhook = (
  rawBody: Buffer,
  receivedSignature: string,
  secretKey: string
): boolean => {
  if (!receivedSignature || !secretKey) {
    return false;
  }

  const calculatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(receivedSignature, "hex");
    const calcBuffer = Buffer.from(calculatedSignature, "hex");

    if (sigBuffer.length !== calcBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, calcBuffer);
  } catch {
    return false;
  }
};
