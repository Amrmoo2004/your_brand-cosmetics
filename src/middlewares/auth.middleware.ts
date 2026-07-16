import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utilites/token/token.js";
import { tokenBlacklistModel } from "../modules/DB/models/tokenBlacklist.model.js";
import { BadRequestException } from "../utilites/response/response.js";
import { userModel } from "../modules/DB/models/user.model.js";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new BadRequestException("Not authenticated, no token provided");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new BadRequestException("Token is missing from Authorization header");
    }

    const blacklisted = await tokenBlacklistModel.findOne({ token });
    if (blacklisted) {
      throw new BadRequestException("Token has been invalidated (logged out)");
    }

    const decoded = verifyToken(token) as any;

    const currentUser = await userModel.findById(decoded.id);
    if (!currentUser) {
      throw new BadRequestException("The user belonging to this token no longer exists");
    }

    (req as any).user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user.role;
    if (!roles.includes(userRole)) {
      return next(
        new BadRequestException("You do not have permission to perform this action")
      );
    }
    next();
  };
};
