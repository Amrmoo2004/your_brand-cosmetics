import mongoose, { Document, Schema } from "mongoose";

export const SOLUBILITY_OPTIONS = [
  "Oil Soluble",
  "Water Soluble",
  "Dispersible",
] as const;

export const ORIGIN_SOURCE_OPTIONS = [
  "Bio-tech Synthetic",
  "Natural Origin",
  "Identical-Synthetic",
] as const;

export const CERTIFICATION_OPTIONS = [
  "Ecocert",
  "COSMOS Standard",
  "Vegan Certified",
] as const;

export type Solubility = (typeof SOLUBILITY_OPTIONS)[number];
export type OriginSource = (typeof ORIGIN_SOURCE_OPTIONS)[number];
export type Certification = (typeof CERTIFICATION_OPTIONS)[number];

export interface IUsageGuidelines {
  minPercentage: number;
  maxPercentage: number;
  defaultPercentage: number;
  pHMin: number;
  pHMax: number;
  tempStabilityValue: number;
  solubility: Solubility;
}

export interface IIngredient extends Document {
  commercialName: string;
  inciName: string;
  categoryId: mongoose.Types.ObjectId;
  supplier?: string;
  brand?: string;
  internalCode: string;
  primaryFunction?: string;
  technicalDescription?: string;
  keyBenefits: string[];
  usageGuidelines: IUsageGuidelines;
  originSource?: OriginSource;
  compatibilityScore: number;
  certifications: Certification[];
  createdBy: mongoose.Types.ObjectId;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    commercialName: {
      type: String,
      required: true,
      trim: true,
    },
    inciName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      required: true,
    },
    supplier: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    internalCode: {
      type: String,
      unique: true,
      required: true,
    },
    primaryFunction: {
      type: String,
      trim: true,
    },
    technicalDescription: {
      type: String,
      trim: true,
    },
    keyBenefits: {
      type: [String],
      default: [],
    },
    usageGuidelines: {
      minPercentage: { type: Number, default: 0 },
      maxPercentage: { type: Number, default: 100 },
      defaultPercentage: { type: Number, default: 1 },
      pHMin: { type: Number, default: 0 },
      pHMax: { type: Number, default: 14 },
      tempStabilityValue: { type: Number, default: 25 },
      solubility: {
        type: String,
        enum: SOLUBILITY_OPTIONS,
        default: "Water Soluble",
      },
    },
    originSource: {
      type: String,
      enum: ORIGIN_SOURCE_OPTIONS,
    },
    compatibilityScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    certifications: {
      type: [String],
      enum: CERTIFICATION_OPTIONS,
      default: [],
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

ingredientSchema.index(
  { commercialName: "text", inciName: "text", primaryFunction: "text" },
  { name: "ingredient_text_search" }
);

export const ingredientModel = mongoose.model<IIngredient>(
  "Ingredient",
  ingredientSchema
);
