import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import compression from "compression";
import authRouter from "./modules/auth/auth.controller.js";
import categoryRouter from "./modules/ingredientCategory/ingredientCategory.controller.js";
import ingredientRouter from "./modules/ingredient/ingredient.controller.js";
import phaseRouter from "./modules/phase/phase.controller.js";
import formulaRouter from "./modules/formula/formula.controller.js";
import mbrRouter from "./modules/mbr/mbr.controller.js";
import packageRouter from "./modules/subscriptionPackage/subscriptionPackage.controller.js";
import templateRouter from "./modules/formulaTemplate/formulaTemplate.controller.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const swaggerDocument = JSON.parse(
    fs.readFileSync(new URL("../swagger.json", import.meta.url), "utf8")
);

export const bootstrap = async (): Promise<express.Application> => {
    const app: express.Application = express();
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};    app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  hsts: false,
}));  
  
    app.use(compression());

    // ── Rate Limiters ─────────────────────────────────────────────────────────────
    // Global: 2000 requests per 15 minutes per IP (was 100 — caused 429s due to polling)
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 2000,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method === 'OPTIONS', // Don't rate-limit preflight requests
        message: { success: false, message: 'Too many requests, please try again later.' },
    });
    app.use(globalLimiter);

    // Auth-specific: 30 login attempts per 15 minutes per IP (stricter)
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method === 'OPTIONS',
        message: { success: false, message: 'Too many login attempts, please try again later.' },
    });
    app.use("/auth", authLimiter);

    // ── Standard Middleware ─────────────────────────────────────────────────────
    dotenv.config();
    app.use(express.json());

    await import("./modules/DB/db.connect.js").then(({ default: connectDB }) => connectDB());

    // Routes
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use("/auth", authRouter);
    app.use("/api/packages", packageRouter);
    app.use("/api/templates", templateRouter);
    app.use("/api/categories", categoryRouter);
    app.use("/api/ingredients", ingredientRouter);
    app.use("/api/phases", phaseRouter);
    app.use("/api/formulas", formulaRouter);
    app.use("/api/mbrs", mbrRouter);

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