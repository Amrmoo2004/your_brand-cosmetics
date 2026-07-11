import { EventEmitter } from "events";
import { sendemails } from "../emails/nodemailer.js";
import { htmlTemplate } from "../emails/emailTemplate.js";

export const emailEmitter = new EventEmitter();

// المستمع الأول: إرسال كود التفعيل عند التسجيل
emailEmitter.on("sendVerificationEmail", async (email: string, otp: string) => {
    try {
        const emailHtml = htmlTemplate({
            title: "Welcome to YOUR BRAND COSMETICS!",
            message: "Thank you for signing up. Please use the following OTP to verify your email address. This code is valid for 10 minutes.",
            code: otp
        });
        
        await sendemails({
            to: email,
            subject: "Verify your email address",
            html: emailHtml
        });
        console.log(`[Event] Verification email sent successfully to ${email}`);
    } catch (error) {
        console.error(`[Event] Failed to send verification email to ${email}:`, error);
    }
});

// المستمع الثاني: إرسال كود استعادة كلمة المرور
emailEmitter.on("sendResetPasswordEmail", async (email: string, otp: string) => {
    try {
        const emailHtml = htmlTemplate({
            title: "Password Reset Request",
            message: "We received a request to reset your password. Use the following OTP to reset it. This code is valid for 10 minutes.",
            code: otp
        });
        
        await sendemails({
            to: email,
            subject: "Password Reset OTP",
            html: emailHtml
        });
        console.log(`[Event] Reset password email sent successfully to ${email}`);
    } catch (error) {
        console.error(`[Event] Failed to send reset password email to ${email}:`, error);
    }
});
