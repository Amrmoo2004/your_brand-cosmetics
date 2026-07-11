import CryptoJS from "crypto-js";


export const encrypt = (
    text: string, 
    secretKey: string = process.env.encryption_key as string
): string => {
    if (!text || !secretKey) {
        throw new Error("Both text and secret key are required for encryption");
    }
    return CryptoJS.AES.encrypt(text, secretKey).toString(); 
};