import nodemailer, { SendMailOptions, SentMessageInfo } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// تحديد أنواع البيانات اللي الدالة بتقبلها
interface SendEmailParams {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    text?: string;
    html?: string;
    subject?: string;
    attachments?: SendMailOptions['attachments']; 
}

export async function sendemails({
    from = process.env.app_email as string,
    to = "",
    cc = "",
    bcc = "",
    text = "",
    html = "",
    subject = "yourbrand cosmetics",
    attachments = []
}: SendEmailParams = {}): Promise<SentMessageInfo> { 

    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false, 
        pool: true, 
        tls: {
            ciphers: "SSLv3",
            rejectUnauthorized: false
        },
        auth: {
            user: process.env.app_email,
            pass: process.env.app_password,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"YOUR BRAND COSMETICS" <${from}>`,
            to, cc, bcc, text, html, subject, attachments
        });

        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}