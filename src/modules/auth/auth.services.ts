import { Request, Response, NextFunction } from "express";
import * as validation from "./auth.validaiton.js";
import { userModel } from "../DB/models/user.model.js";
import { tokenBlacklistModel } from "../DB/models/tokenBlacklist.model.js";
import { BadRequestException } from "../../utilites/response/response.js";
import { generatehash, comparehash } from "../../utilites/hashing/hash.js";
import { generateToken } from "../../utilites/token/token.js";
import { emailEmitter } from "../../utilites/events/email.event.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

class AuthService {
  constructor() { }

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.signupSchema.parse(req.body);

    const existingUser = await userModel.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestException("Email is already registered");
    }

    const hashedPassword = await generatehash({ plaintext: data.password });
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const userPayload: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      country: data.country,
      email: data.email,
      password: hashedPassword,
      otp,
      otpExpiresAt,
      isVerified: true, // bypassed
    };
    if (data.phone) {
      userPayload.phone = data.phone;
    }
    await userModel.create(userPayload);

    // Emit event to send email in the background
    // emailEmitter.emit("sendVerificationEmail", data.email, otp);

    res.status(201).json({
      message: "User created successfully.",
    });
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.verifyEmailSchema.parse(req.body);

    const user = await userModel.findOne({ email: data.email });
    if (!user) {
      throw new BadRequestException("Invalid email");
    }

    if (user.isVerified) {
      throw new BadRequestException("Email is already verified");
    }

    if (user.otp !== data.otp) {
      throw new BadRequestException("Invalid OTP");
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException("OTP has expired. Please request a new one.");
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully. You can now login.",
    });
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.loginSchema.parse(req.body);

    const user = await userModel.findOne({ email: data.email });
    if (!user) {
      throw new BadRequestException("Invalid email or password");
    }

    // if (!user.isVerified) {
    //   throw new BadRequestException("Please verify your email first before logging in.");
    // }

    const isMatch = await comparehash(data.password, user.password!);
    if (!isMatch) {
      throw new BadRequestException("Invalid email or password");
    }

    const token = generateToken({ id: user._id, role: user.role });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.forgotPasswordSchema.parse(req.body);

    const user = await userModel.findOne({ email: data.email });
    if (!user) {
      throw new BadRequestException("If the email exists, an OTP will be sent.");
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    emailEmitter.emit("sendResetPasswordEmail", user.email, otp);

    res.status(200).json({
      message: "If the email exists, an OTP has been sent.",
    });
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.resetPasswordSchema.parse(req.body);

    const user = await userModel.findOne({ email: data.email });
    if (!user) {
      throw new BadRequestException("Invalid email or OTP");
    }

    if (user.otp !== data.otp) {
      throw new BadRequestException("Invalid OTP");
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException("OTP has expired. Please request a new one.");
    }

    const hashedPassword = await generatehash({ plaintext: data.newPassword });
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      message: "Password reset successfully. You can now login.",
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new BadRequestException("No token provided");
    }

    const existingBlacklist = await tokenBlacklistModel.findOne({ token });
    if (existingBlacklist) {
      throw new BadRequestException("Token is already invalidated");
    }

    await tokenBlacklistModel.create({ token });

    res.status(200).json({
      message: "Logged out successfully. Token is now blacklisted.",
    });
  };

  googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const data = validation.googleAuthSchema.parse(req.body);

    const ticket = await client.verifyIdToken({
      idToken: data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new BadRequestException("Invalid Google token");
    }

    const { email, given_name, family_name, sub } = payload;

    if (!email) {
      throw new BadRequestException("Email not provided from Google");
    }

    let user = await userModel.findOne({ email });

    if (!user) {
      // Create a new user
      user = await userModel.create({
        firstName: given_name || "User",
        lastName: family_name || "",
        companyName: "N/A",
        country: "N/A",
        email,
        googleId: sub,
        isVerified: true,
      });
    } else {
      if (!user.googleId) {
        user.googleId = sub;
        await user.save();
      }
    }

    const token = generateToken({ id: user._id, role: user.role });

    res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  };
}

export const authservice = new AuthService();