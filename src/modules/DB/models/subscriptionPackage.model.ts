import mongoose, { Document, Schema } from "mongoose";

export interface ISubscriptionPackage extends Document {
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  activeStatus: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const subscriptionPackageSchema = new Schema<ISubscriptionPackage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    features: {
      type: [String],
      default: [],
    },
    activeStatus: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const subscriptionPackageModel = mongoose.model<ISubscriptionPackage>(
  "SubscriptionPackage",
  subscriptionPackageSchema
);
