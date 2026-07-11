import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRouter from "./modules/auth/auth.controller.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const swaggerDocument = JSON.parse(
    fs.readFileSync(new URL("../swagger.json", import.meta.url), "utf8")
);

export const bootstrap = async (): Promise<express.Application> => {
    const app: express.Application = express();
    
    app.use(cors());
    app.use(helmet());
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 دقيقة
        max: 100 // السماح بـ 100 طلب فقط لكل IP
    }));
    dotenv.config(); 
    app.use(express.json());

    await import("./modules/DB/db.connect.js").then(({ default: connectDB }) => connectDB());

    // Routes
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use("/auth", authRouter);

    app.get("/", (req: Request, res: Response) => {
        res.send({ message: "Hello, the server is secure and running!" });
    });

    app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = error.statusCode || 500;
    
    return res.status(statusCode).json({
        err_message: error.message || "Something went wrong!!",
        errors: error.details?.validationErrors || undefined, 
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
});

    
    return app;
};