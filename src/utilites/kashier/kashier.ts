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

    const apiKey = process.env.KASHIER_API_KEY || "";
    const secretKeyPart1 = secretKey.includes("$") ? secretKey.split("$")[0] : secretKey;
    const secretKeyPart2 = secretKey.includes("$") ? secretKey.split("$")[1] : secretKey;

    const keysToTest = [
      { name: "Full SecretKey", key: secretKey },
      { name: "SecretKey Part1 (before $)", key: secretKeyPart1 },
      { name: "SecretKey Part2 (after $)", key: secretKeyPart2 },
      { name: "API Key", key: apiKey },
    ].filter((k): k is { name: string; key: string } => !!k.key);

    // Build candidate strings
    const queryString = data.signatureKeys
      .map((key: string) => `${key}=${data[key]}`)
      .join("&");

    const valuesOnlyDot = data.signatureKeys
      .map((key: string) => `${data[key]}`)
      .join(".");

    const valuesOnlyAmp = data.signatureKeys
      .map((key: string) => `${data[key]}`)
      .join("&");

    const stdFormat = `${data.merchantId}.${data.merchantOrderId || data.kashierOrderId}.${data.amount}.${data.currency}`;

    const candidateStrings: { name: string; str: string }[] = [
      { name: "HTTPS Full URL (payments)", str: `https://your-brand-formulator.duckdns.org/api/payments/webhook?${queryString}` },
      { name: "HTTP Full URL (payments)", str: `http://your-brand-formulator.duckdns.org/api/payments/webhook?${queryString}` },
      { name: "Path (/api/payments/webhook)", str: `/api/payments/webhook?${queryString}` },
      { name: "Path (/api/webhooks/kashier)", str: `/api/webhooks/kashier?${queryString}` },
      { name: "Query with ?", str: `?${queryString}` },
      { name: "Bare Query String", str: queryString },
      { name: "Values joined with .", str: valuesOnlyDot },
      { name: "Values joined with &", str: valuesOnlyAmp },
      { name: "Standard MID.order.amount.currency", str: stdFormat },
    ];

    console.log("--- Kashier Extended Format Tests ---");
    let matched = false;

    for (const kObj of keysToTest) {
      for (const sObj of candidateStrings) {
        const calculated = crypto
          .createHmac("sha256", kObj.key)
          .update(sObj.str)
          .digest("hex");

        const isMatch = calculated.toLowerCase() === signature.toLowerCase();
        if (isMatch) {
          console.log(`✅ MATCH FOUND! Key: [${kObj.name}] | Format: [${sObj.name}]`);
          console.log(`   String hashed: "${sObj.str}"`);
          matched = true;
          return true;
        }
      }
    }

    console.log("❌ No format matched among all candidates.");
    console.log(`   Sample hash (Full Secret + Path): ${crypto.createHmac("sha256", secretKey).update(`/api/payments/webhook?${queryString}`).digest("hex")}`);
    console.log(`   Expected signature:              ${signature}`);
    console.log("-------------------------------------");

    return matched;
  } catch (error) {
    console.error("[Kashier] Error verifying webhook signature:", error);
    return false;
  }
}

