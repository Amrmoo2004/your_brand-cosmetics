import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// الـ payload ممكن يكون Object أو String
export const generateToken = (payload: string | object | Buffer): string => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return jwt.sign(
        payload,
        secret,
        { expiresIn: "7d" } as SignOptions
    );
};

// الـ verify بترجع إما String أو JwtPayload (Object)
export const verifyToken = (token: string): string | JwtPayload => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return jwt.verify(token, secret);
};