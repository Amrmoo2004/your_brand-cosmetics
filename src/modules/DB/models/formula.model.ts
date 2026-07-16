import mongoose, { Document, Schema } from "mongoose";

export const FORMULA_STATUS_OPTIONS = [
  "Draft",
  "In Review",
  "Approved",
  "Production Ready",
  "Archived",
] as const;

export const FORMULA_TYPE_OPTIONS = [
  "O/W Emulsion (Oil in Water)",
  "W/O Emulsion (Water in Oil)",
  "Anhydrous",
  "Gel",
  "Serum",
  "Solution",
  "Suspension",
] as const;

export const MEASUREMENT_UNIT_OPTIONS = ["kg", "g", "L", "mL"] as const;

export const SHELF_LIFE_OPTIONS = [
  "6 months",
  "12 months",
  "18 months",
  "24 months",
  "36 months",
] as const;

export type FormulaStatus = (typeof FORMULA_STATUS_OPTIONS)[number];
export type FormulaType = (typeof FORMULA_TYPE_OPTIONS)[number];
export type MeasurementUnit = (typeof MEASUREMENT_UNIT_OPTIONS)[number];
export type ShelfLife = (typeof SHELF_LIFE_OPTIONS)[number];

export interface IFormulaIngredient {
  ingredientId: mongoose.Types.ObjectId;
  targetPercentage: number;
  calculatedWeight: number;
}

export interface IFormulaPhase {
  phaseId: mongoose.Types.ObjectId;
  phaseName: string;
  ingredients: IFormulaIngredient[];
}

export interface IFormula extends Document {
  formulaName: string;
  category: string;
  productType?: string;
  targetMarket?: string;
  description?: string;
  targetBatchSize: number;
  measurementUnit: MeasurementUnit;
  formulaType: FormulaType;
  preservationSystem?: string;
  expectedShelfLife?: ShelfLife;
  methodology?: string;
  regulatoryStandards?: string;
  labLocation?: string;
  targetpHMin?: number;
  targetpHMax?: number;
  status: FormulaStatus;
  phases: IFormulaPhase[];
  createdBy: mongoose.Types.ObjectId;
}

const formulaIngredientSchema = new Schema<IFormulaIngredient>(
  {
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    targetPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    calculatedWeight: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const formulaPhaseSchema = new Schema<IFormulaPhase>(
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
    ingredients: {
      type: [formulaIngredientSchema],
      default: [],
    },
  },
  { _id: false }
);

const formulaSchema = new Schema<IFormula>(
  {
    formulaName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    productType: {
      type: String,
      trim: true,
    },
    targetMarket: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetBatchSize: {
      type: Number,
      required: true,
      min: 0,
    },
    measurementUnit: {
      type: String,
      enum: MEASUREMENT_UNIT_OPTIONS,
      default: "kg",
    },
    formulaType: {
      type: String,
      enum: FORMULA_TYPE_OPTIONS,
      required: true,
    },
    preservationSystem: {
      type: String,
      trim: true,
    },
    expectedShelfLife: {
      type: String,
      enum: SHELF_LIFE_OPTIONS,
    },
    methodology: {
      type: String,
      trim: true,
    },
    regulatoryStandards: {
      type: String,
      trim: true,
    },
    labLocation: {
      type: String,
      trim: true,
    },
    targetpHMin: {
      type: Number,
    },
    targetpHMax: {
      type: Number,
    },
    status: {
      type: String,
      enum: FORMULA_STATUS_OPTIONS,
      default: "Draft",
    },
    phases: {
      type: [formulaPhaseSchema],
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

export const formulaModel = mongoose.model<IFormula>("Formula", formulaSchema);
