import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { BadRequestException } from "../utilites/response/response.js";
type KeyReqType = 'body' | 'params' | 'query' | 'file';
type SchemaType = Partial<Record<KeyReqType, ZodType>>;

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationErrors: any[] = [];

        for (const key of Object.keys(schema) as KeyReqType[]) {
            if (!schema[key]) continue;

const validationResult = schema[key]!.safeParse((req as any)[key]);            
            if (!validationResult.success) {
                const errors = validationResult.error as ZodError;
                
                validationErrors.push({
                    key,
                    issues: errors.issues.map(issue => ({
                        message: issue.message,
                        path: issue.path
                    }))
                });
            }
        }

        if (validationErrors.length) {
            throw new BadRequestException("Validation Error", {
                validationErrors,
            });
        }

        return next();
    };
};

import { z } from "zod";

export const generalFields = {
    username: z
        .string({
            message: "username is required", 
        })
        .min(2, { message: "min username length is 2 char" })
        .max(20, { message: "max username length is 20 char" }),
        
    email: z.string().email({
        message: "valid email must be like to example@domain.com",
    }),
    
    password: z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, {
            message: "Password must contain at least one number, one lowercase, one uppercase letter, and be at least 8 characters long"
        }),
        
    confirmPassword: z.string(),
};