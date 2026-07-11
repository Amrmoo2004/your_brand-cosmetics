import http from 'http';
import { bootstrap } from "./app.js";

// بنعمل دالة غير متزامنة عشان نقدر نستخدم await
async function startServer() {
    try {
        // 1. نستنى تطبيق Express يجهز بالكامل
        const app = await bootstrap();

        // 2. نمرر التطبيق الجاهز للسيرفر
        const server = http.createServer(app);

        // ملحوظة: لو بتستخدم Socket.io لازم تربطه بالسيرفر هنا قبل ما تعمل listen
        // const io = new Server(server); 

        // 3. بنستخدم PORT بحروف كبيرة (الأكثر شيوعاً في بيئات التشغيل)
        const port = process.env.PORT || 3000;

        // 4. تشغيل السيرفر
        server.listen(port, () => {
            console.log(`🚀 Server is running at http://localhost:${port}`);
            console.log(`⚡ Socket.IO is listening on ws://localhost:${port}`);
        });

    } catch (error) {
        // لو حصل أي خطأ في البداية بنطبعه ونقفل التطبيق
        console.error("❌ Error starting the server:", error);
        process.exit(1);
    }
}

// استدعاء الدالة لتشغيل كل حاجة
startServer();