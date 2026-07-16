import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  companyName: string;
  country: string;
  email: string;
  password?: string;
  phone?: string;
  role: "user" | "admin";
  isVerified: boolean;
  otp?: string | undefined;
  otpExpiresAt?: Date | undefined;
  googleId?: string;
  purchasedPackages: mongoose.Types.ObjectId[];
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    googleId: {
      type: String,
    },
    purchasedPackages: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubscriptionPackage",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const userModel = mongoose.model<IUser>("User", userSchema);
