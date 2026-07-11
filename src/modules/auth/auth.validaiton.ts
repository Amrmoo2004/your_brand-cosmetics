import { z } from "zod";

export const generalFields = {
    firstName: z.string().min(2).max(20),
    lastName: z.string().min(2).max(20),
    companyName: z.string().min(2).max(50),
    country: z.string().min(2).max(50),
        
    email: z.string().email({
        message: "valid email must be like to example@domain.com",
    }),
    
    password: z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, {
            message: "Password must contain at least one number, one lowercase, one uppercase letter, and be at least 8 characters long"
        }),
        
    confirmPassword: z.string(),
    
    phone: z.string().optional(),
};

export const signupSchema = z.object({
    firstName: generalFields.firstName,
    lastName: generalFields.lastName,
    companyName: generalFields.companyName,
    country: generalFields.country,
    email: generalFields.email,
    password: generalFields.password,
    confirmPassword: generalFields.confirmPassword,
    phone: generalFields.phone,
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
});

export const loginSchema = z.object({
    email: generalFields.email,
    password: generalFields.password,
});

export const verifyEmailSchema = z.object({
    email: generalFields.email,
    otp: z.string().length(6, 'OTP must be exactly 6 characters long'),
});

export const forgotPasswordSchema = z.object({
    email: generalFields.email,
});

export const resetPasswordSchema = z.object({
    email: generalFields.email,
    otp: z.string().length(6, 'OTP must be exactly 6 characters long'),
    newPassword: generalFields.password,
    confirmPassword: generalFields.confirmPassword,
}).superRefine((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
});

export const googleAuthSchema = z.object({
    idToken: z.string({
        message: "idToken is required"
    }),
});
