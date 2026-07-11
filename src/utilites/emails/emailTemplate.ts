export interface EmailTemplateParams {
    title: string;
    message: string;
    code?: string;
}

export const htmlTemplate = ({ title, message, code }: EmailTemplateParams): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f7f6;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                overflow: hidden;
            }
            .header {
                background-color: #4a90e2;
                padding: 20px;
                text-align: center;
                color: #ffffff;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 30px;
                color: #333333;
                line-height: 1.6;
                text-align: center;
            }
            .content p {
                font-size: 16px;
                margin-bottom: 20px;
            }
            .otp-box {
                display: inline-block;
                background-color: #f8f9fa;
                padding: 15px 30px;
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 5px;
                color: #4a90e2;
                border: 2px dashed #4a90e2;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #777777;
                border-top: 1px solid #eeeeee;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                <p>${message}</p>
                ${code ? `<div class="otp-box">${code}</div>` : ''}
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ZMSCO Cosmetics. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
