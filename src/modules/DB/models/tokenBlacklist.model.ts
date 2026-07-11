import mongoose, { Document, Schema } from "mongoose";

export interface ITokenBlacklist extends Document {
  token: string;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d' 
    }
  }
);

export const tokenBlacklistModel = mongoose.model<ITokenBlacklist>("TokenBlacklist", tokenBlacklistSchema);
