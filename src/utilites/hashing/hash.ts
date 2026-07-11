import bcrypt from "bcryptjs";

// تعريف أنواع البيانات للمُدخلات
interface GenerateHashParams {
  plaintext?: string;
  saltround?: number | string;
}

export const generatehash = async ({ 
    plaintext = "", 
    saltround 
}: GenerateHashParams = {}): Promise<string> => {
    if (!plaintext) {
        throw new Error("Plaintext password is required");
    }

    // Use provided saltround or fallback to env or default to 10
    const rounds = Number(saltround || process.env.SALTROUNDS || 10);

    if (!Number.isInteger(rounds) || rounds <= 0) {
        throw new Error(`Invalid salt rounds: ${rounds}`);
    }

    return await bcrypt.hash(plaintext, rounds);
};

export const comparehash = async (plaintext: string, hash: string): Promise<boolean> => {
    if (!plaintext || !hash) {
        throw new Error("Both plaintext password and hash are required");
    }
    return await bcrypt.compare(plaintext, hash);
};