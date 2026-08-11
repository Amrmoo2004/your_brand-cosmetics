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
 * Verify Kashier webhook signature.
 *
 * Tries 3 possible string formats that Kashier may use to sign the payload:
 *   Format 1: /api/webhooks/kashier?key=val&key=val   (full path + query)
 *   Format 2: ?key=val&key=val                         (query only with ?)
 *   Format 3:  key=val&key=val                         (bare query string)
 *
 * Logs which format matched so we can hard-code it permanently afterwards.
 *
 * @param payload   - Fully parsed webhook JSON body (req.body)
 * @param signature - Signature sent by Kashier (header / body field)
 * @returns true if any format matches
 */
export function verifyKashierWebhook(payload: any, signature: string): boolean {
  try {
    const secretKey = process.env.KASHIER_SECRET_KEY || "";
    if (!secretKey || !signature) return false;

    // ── Secret Key Diagnostics ──────────────────────────────────────────────
    const firstChars = secretKey.substring(0, 10);
    const lastChars  = secretKey.substring(secretKey.length - 10);
    console.log(`[Kashier Debug] Secret key length: ${secretKey.length}`);
    console.log(`[Kashier Debug] First 10 chars: "${firstChars}"`);
    console.log(`[Kashier Debug] Last  10 chars: "${lastChars}"`);
    console.log(`[Kashier Debug] Contains $ sign: ${secretKey.includes("$")}`);
    console.log(`[Kashier Debug] Starts with ': ${secretKey.startsWith("'")}`);
    console.log(`[Kashier Debug] Received signature: ${signature}`);
    // ────────────────────────────────────────────────────────────────────────

    const data = payload?.data;
    if (!data || !Array.isArray(data.signatureKeys)) {
      console.error("[Kashier] Missing data.signatureKeys in payload");
      return false;
    }

    // Build query string in the exact order Kashier specifies via signatureKeys
    const queryString = data.signatureKeys
      .map((key: string) => `${key}=${data[key]}`)
      .join("&");

    // Path MUST match exactly the Webhook URL registered in Kashier dashboard
    const format1 = `/api/payments/webhook?${queryString}`;
    const format2 = `?${queryString}`;
    const format3 = queryString;

    const hmac = (key: string, s: string) =>
      crypto.createHmac("sha256", key).update(s).digest("hex");

    const h1 = hmac(secretKey, format1);
    const h2 = hmac(secretKey, format2);
    const h3 = hmac(secretKey, format3);

    // Format 4 & 5: try with KASHIER_API_KEY (Kashier uses a separate webhook key)
    const apiKey = process.env.KASHIER_API_KEY || "";
    const h4 = apiKey ? hmac(apiKey, format1) : "";
    const h5 = apiKey ? hmac(apiKey, format3) : "";

    const match1 = h1 === signature;
    const match2 = h2 === signature;
    const match3 = h3 === signature;
    const match4 = !!apiKey && h4 === signature;
    const match5 = !!apiKey && h5 === signature;

    console.log("--- Kashier Format Tests ---");
    console.log(`[Format 1 - SecretKey + Full Path] Match? ${match1}`);
    console.log(`[Format 2 - SecretKey + ?+Query  ] Match? ${match2}`);
    console.log(`[Format 3 - SecretKey + BareQuery ] Match? ${match3}`);
    console.log(`[Format 4 - ApiKey   + Full Path  ] Match? ${match4}`);
    console.log(`[Format 5 - ApiKey   + BareQuery  ] Match? ${match5}`);
    console.log("----------------------------");

    return match1 || match2 || match3 || match4 || match5;
  } catch (error) {
    console.error("[Kashier] Error verifying webhook signature:", error);
    return false;
  }
}
