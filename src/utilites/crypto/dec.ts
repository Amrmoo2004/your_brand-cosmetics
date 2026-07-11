import CryptoJS from "crypto-js";

export const decrypt = (
    ciphertext: string, 
    secretKey: string = process.env.encryption_key  as string
): string => {
    if (!ciphertext || !secretKey) {
        throw new Error("Both ciphertext and secret key are required for decryption");
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};