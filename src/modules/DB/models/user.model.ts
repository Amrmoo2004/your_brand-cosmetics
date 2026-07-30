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
  // Card Tokenization (token is stored encrypted — never raw card data)
  cardToken?: string;
  cardLastFour?: string;
  cardBrand?: string;
  // Subscription Management
  subscriptionEndDate?: Date;
  planStatus: "none" | "active" | "expired";
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
    // Card Tokenization
    cardToken: {
      type: String,
    },
    cardLastFour: {
      type: String,
      maxlength: 4,
    },
    cardBrand: {
      type: String,
    },
    // Subscription Management
    subscriptionEndDate: {
      type: Date,
    },
    planStatus: {
      type: String,
      enum: ["none", "active", "expired"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

export const userModel = mongoose.model<IUser>("User", userSchema);
