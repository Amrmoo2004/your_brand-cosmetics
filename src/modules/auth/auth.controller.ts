import { Router } from "express";
import { authservice } from "./auth.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./auth.validaiton.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", validation({ body: validations.signupSchema }), authservice.signup);
router.post("/verify-email", validation({ body: validations.verifyEmailSchema }), authservice.verifyEmail);
router.post("/login", validation({ body: validations.loginSchema }), authservice.login);
router.post("/forgot-password", validation({ body: validations.forgotPasswordSchema }), authservice.forgotPassword);
router.post("/reset-password", validation({ body: validations.resetPasswordSchema }), authservice.resetPassword);
router.post("/logout", protect, authservice.logout);
router.post("/google", validation({ body: validations.googleAuthSchema }), authservice.googleAuth);

export default router;