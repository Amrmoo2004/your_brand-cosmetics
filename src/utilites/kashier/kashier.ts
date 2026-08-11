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
 * Verify Kashier webhook signature using the signatureKeys array
 * that Kashier includes in every webhook payload.
 *
 * Kashier's algorithm:
 *  1. Read data.signatureKeys[] from the webhook body
 *  2. Build a query string: key1=val1&key2=val2 (in the order Kashier provides)
 *  3. Prepend the webhook path: /path?key1=val1&...
 *  4. HMAC-SHA256 the resulting string with your Secret Key
 *
 * @param payload        - The fully parsed webhook JSON body (req.body)
 * @param receivedSig    - The signature value from Kashier (header / body.data.hash)
 * @param secretKey      - Your KASHIER_SECRET_KEY
 * @param webhookPath    - The URL path registered in your Kashier dashboard
 * @returns true if the signature is valid
 */
export const verifyKashierWebhook = (
  payload: any,
  receivedSig: string,
  secretKey: string,
  webhookPath: string
): boolean => {
  try {
    if (!receivedSig || !secretKey) return false;

    const data = payload?.data;
    if (!data || !Array.isArray(data.signatureKeys)) {
      console.error("[Kashier] Missing data.signatureKeys in payload");
      return false;
    }

    // Build: key1=value1&key2=value2 in the exact order Kashier specifies
    const queryString = data.signatureKeys
      .map((key: string) => `${key}=${data[key]}`)
      .join("&");

    // Full string to hash: path?query
    const rawString = `${webhookPath}?${queryString}`;
    console.log("[Kashier Debug] String to hash:", rawString);

    const calculatedSig = crypto
      .createHmac("sha256", secretKey)
      .update(rawString)
      .digest("hex");

    console.log("[Kashier Debug] Calculated sig:", calculatedSig);
    console.log("[Kashier Debug] Received sig:  ", receivedSig);

    // Constant-time comparison
    const calcBuf = Buffer.from(calculatedSig, "hex");
    const recvBuf = Buffer.from(receivedSig,   "hex");
    if (calcBuf.length !== recvBuf.length) return false;
    return crypto.timingSafeEqual(calcBuf, recvBuf);
  } catch (err) {
    console.error("[Kashier] Error verifying webhook signature:", err);
    return false;
  }
};
