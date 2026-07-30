import http from 'http';
import { bootstrap } from "./app.js";

async function startServer() {
    try {
        const app = await bootstrap();

        const server = http.createServer(app);

        const port = process.env.PORT || 3000;

        server.listen(port, () => {
            console.log(`🚀 Server is running at http://localhost:${port}`);
            console.log(`⚡ Socket.IO is listening on ws://localhost:${port}`);
        });

    } catch (error) {
        console.error("❌ Error starting the server:", error);
        process.exit(1);
    }
}

startServer();