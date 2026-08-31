import mongoose, { Document, Schema } from "mongoose";
import { FORMULA_TYPE_OPTIONS, FormulaType } from "./formula.model.js";

// ── Compatibility Rule Types ─────────────────────────────────────────────
export const RULE_TYPE_OPTIONS = [
  "REQUIRE_CATEGORY",
  "RESTRICT_COMBINATION",
  "REQUIRE_PHASE",
] as const;

export const RULE_SEVERITY_OPTIONS = ["error", "warning"] as const;

export type RuleType = (typeof RULE_TYPE_OPTIONS)[number];
export type RuleSeverity = (typeof RULE_SEVERITY_OPTIONS)[number];

export interface ICompatibilityRule {
  ruleType: RuleType;
  conditionCategory: mongoose.Types.ObjectId;
  requiredCategory?: mongoose.Types.ObjectId;
  restrictedCategory?: mongoose.Types.ObjectId;
  requiredPhaseName?: string;
  errorMessage: string;
  severity: RuleSeverity;
}

export interface ITemplatePhaseCategory {
  categoryId: mongoose.Types.ObjectId;
  minItems?: number;
  maxItems?: number;
  minPercentage?: number;
  maxPercentage?: number;
  minPercentagePerItem: number;
  maxPercentagePerItem: number;
}

export interface ITemplatePhase {
  _id?: mongoose.Types.ObjectId;
  phaseId?: mongoose.Types.ObjectId;
  phaseName: string;
  allowedCategories?: ITemplatePhaseCategory[];
}

export interface IFormulaTemplate extends Document {
  templateName: string;
  category: string;
  formulaType: FormulaType;
  packageId: mongoose.Types.ObjectId;
  description?: string;
  phases: ITemplatePhase[];
  compatibilityRules: ICompatibilityRule[];
  methodSteps: string[];
  activeStatus: boolean;
  createdBy: mongoose.Types.ObjectId;
}

// ── Sub-document Schemas ─────────────────────────────────────────────────
const compatibilityRuleSchema = new Schema<ICompatibilityRule>(
  {
    ruleType: {
      type: String,
      enum: RULE_TYPE_OPTIONS,
      required: true,
    },
    conditionCategory: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      required: true,
    },
    requiredCategory: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
    },
    restrictedCategory: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
    },
    requiredPhaseName: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: RULE_SEVERITY_OPTIONS,
      default: "error",
    },
  },
  { _id: true }
);

const templatePhaseCategorySchema = new Schema<ITemplatePhaseCategory>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      required: true,
    },
    minItems: {
      type: Number,
      min: 0,
    },
    maxItems: {
      type: Number,
      min: 1,
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
    minPercentagePerItem: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maxPercentagePerItem: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const templatePhaseSchema = new Schema<ITemplatePhase>(
  {
    phaseId: {
      type: Schema.Types.ObjectId,
      ref: "Phase",
      required: false,
    },
    phaseName: {
      type: String,
      required: true,
      trim: true,
    },
    allowedCategories: {
      type: [templatePhaseCategorySchema],
      default: [],
    },
  },
  { _id: true }
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
    compatibilityRules: {
      type: [compatibilityRuleSchema],
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
