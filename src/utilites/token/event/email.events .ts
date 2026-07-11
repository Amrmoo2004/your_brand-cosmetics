import { EventEmitter } from "node:events";
import { sendemails } from "../../emails/nodemailer.js"; 

interface ConfirmEmailData {
    to: string;
    username: string;
    otp: string | number;
}

interface ForgotPasswordData {
    to: string;
    otp: string | number;
}

export const emailevnt = new EventEmitter();

emailevnt.on("confirmemail", async (data: ConfirmEmailData) => {
    try {
        console.log(`[EMAIL] Sending verification email to: ${data.to}`);
        
        const info = await sendemails({
            to: data.to,
            subject: `Your Verification Code: ${data.otp}`,
            html: `<h1>Hi ${data.username},</h1><p>Your code is: ${data.otp}</p>` 
        });
        
        console.log(`[EMAIL] Verification email sent successfully to: ${data.to}`, info?.messageId);
    } catch (error: any) {
        console.error(`[EMAIL ERROR] Failed to send verification email to: ${data.to}`);
        console.error(`[EMAIL ERROR] Details:`, error.message);
    }
});

emailevnt.on("forgotpassword", async (data: ForgotPasswordData) => {
    try {
        console.log(`[EMAIL] Sending forgot password email to: ${data.to}`);
        
        const info = await sendemails({
            to: data.to,
            subject: `Your forgot password OTP`,
            html: `<h1>Hi,</h1><p>Your forgot password code is: ${data.otp}</p>` // الكود الأساسي بتاعك
        });
        
        console.log(`[EMAIL] Forgot password email sent successfully to: ${data.to}`, info?.messageId);
    } catch (error: any) {
        console.error(`[EMAIL ERROR] Failed to send forgot password email to: ${data.to}`);
        console.error(`[EMAIL ERROR] Details:`, error.message);
    }
});