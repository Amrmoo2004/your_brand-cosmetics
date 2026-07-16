import mongoose, { Document, Schema } from "mongoose";
import { FORMULA_TYPE_OPTIONS, FormulaType } from "./formula.model.js";

export interface ITemplatePhase {
  phaseId: mongoose.Types.ObjectId;
  phaseName: string;
  minPercentage?: number;
  maxPercentage?: number;
}

export interface IFormulaTemplate extends Document {
  templateName: string;
  category: string;
  formulaType: FormulaType;
  packageId: mongoose.Types.ObjectId;
  description?: string;
  phases: ITemplatePhase[];
  methodSteps: string[];
  activeStatus: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const templatePhaseSchema = new Schema<ITemplatePhase>(
  {
    phaseId: {
      type: Schema.Types.ObjectId,
      ref: "Phase",
      required: true,
    },
    phaseName: {
      type: String,
      required: true,
    },
    minPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    maxPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const formulaTemplateSchema = new Schema<IFormulaTemplate>(
  {
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    formulaType: {
      type: String,
      enum: FORMULA_TYPE_OPTIONS,
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    phases: {
      type: [templatePhaseSchema],
      default: [],
    },
    methodSteps: {
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

export const formulaTemplateModel = mongoose.model<IFormulaTemplate>(
  "FormulaTemplate",
  formulaTemplateSchema
);
