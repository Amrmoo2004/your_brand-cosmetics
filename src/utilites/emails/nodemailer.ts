import nodemailer, { SendMailOptions, SentMessageInfo } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

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
    from = process.env.BREVO_FROM_EMAIL as string, 
    to = "",
    cc = "",
    bcc = "",
    text = "",
    html = "",
    subject = "yourbrand cosmetics",
    attachments = []
}: SendEmailParams = {}): Promise<SentMessageInfo> { 

    const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST, 
        port: Number(process.env.BREVO_SMTP_PORT) || 587,
        secure: false,
        pool: true, 
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"YOUR BRAND COSMETICS" <${from}>`,
            to, 
            cc, 
            bcc, 
            text, 
            html, 
            subject, 
            attachments
        });

        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}