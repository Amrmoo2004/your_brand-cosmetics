import mongoose, { Document, Schema } from "mongoose";

export const CATEGORY_ICONS = [
  "Water",
  "Oil",
  "Flask",
  "Leaf",
  "Snowflake",
  "Shield",
  "Flower",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export interface IIngredientCategory extends Document {
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  iconEnum: CategoryIcon;
  isMinAllowed: boolean;
  isMaxAllowed: boolean;
  isRequiredFormula: boolean;
  isAutoValidationEnabled: boolean;
  activeStatus: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const ingredientCategorySchema = new Schema<IIngredientCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    iconEnum: {
      type: String,
      enum: CATEGORY_ICONS,
      default: "Water",
    },
    isMinAllowed: {
      type: Boolean,
      default: false,
    },
    isMaxAllowed: {
      type: Boolean,
      default: false,
    },
    isRequiredFormula: {
      type: Boolean,
      default: false,
    },
    isAutoValidationEnabled: {
      type: Boolean,
      default: false,
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

export const ingredientCategoryModel = mongoose.model<IIngredientCategory>(
  "IngredientCategory",
  ingredientCategorySchema
);
