import mongoose, { Document, Schema } from "mongoose";

export const MBR_STATUS_OPTIONS = [
  "Draft",
  "In Review",
  "Approved",
  "Production Ready",
  "Completed",
  "On Hold",
] as const;

export const TIME_UNIT_OPTIONS = ["hrs", "mins"] as const;

export type MbrStatus = (typeof MBR_STATUS_OPTIONS)[number];
export type TimeUnit = (typeof TIME_UNIT_OPTIONS)[number];

export interface IMbrIngredient {
  ingredientId: mongoose.Types.ObjectId;
  ingredientName: string;
  inciName: string;
  targetPercentage: number;
  calculatedWeight: number;
  checked: boolean;
}

export interface IMbrPhase {
  phaseName: string;
  ingredients: IMbrIngredient[];
  subtotal: number;
}

export interface IProductionStep {
  stepNumber: number;
  description: string;
  timeStarted?: Date;
  operatorInitials?: string;
}

export interface IValidationCheck {
  id: string;
  name: string;
  status: "success" | "warning" | "error";
  message: string;
}

export interface IMbr extends Document {
  mbrCode: string;
  formulaId: mongoose.Types.ObjectId;
  status: MbrStatus;
  revision: string;
  batchSize: {
    value: number;
    unit: string;
  };
  targetpHMin?: number;
  targetpHMax?: number;
  estProductionTime: {
    value: number;
    unit: TimeUnit;
  };
  phases: IMbrPhase[];
  totalBatchWeight: number;
  productionSteps: IProductionStep[];
  validationChecks: IValidationCheck[];
  createdBy: mongoose.Types.ObjectId;
}

const mbrIngredientSchema = new Schema<IMbrIngredient>(
  {
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    ingredientName: {
      type: String,
      required: true,
    },
    inciName: {
      type: String,
      required: true,
    },
    targetPercentage: {
      type: Number,
      required: true,
    },
    calculatedWeight: {
      type: Number,
      required: true,
    },
    checked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const mbrPhaseSchema = new Schema<IMbrPhase>(
  {
    phaseName: {
      type: String,
      required: true,
    },
    ingredients: {
      type: [mbrIngredientSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productionStepSchema = new Schema<IProductionStep>(
  {
    stepNumber: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    timeStarted: {
      type: Date,
    },
    operatorInitials: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const validationCheckSchema = new Schema<IValidationCheck>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "warning", "error"],
      required: true,
    },
    message: { type: String, required: true },
  },
  { _id: false }
);

const mbrSchema = new Schema<IMbr>(
  {
    mbrCode: {
      type: String,
      unique: true,
      required: true,
    },
    formulaId: {
      type: Schema.Types.ObjectId,
      ref: "Formula",
      required: true,
    },
    status: {
      type: String,
      enum: MBR_STATUS_OPTIONS,
      default: "Draft",
    },
    revision: {
      type: String,
      default: "Rev A.1",
    },
    batchSize: {
      value: { type: Number, required: true },
      unit: { type: String, default: "kg" },
    },
    targetpHMin: {
      type: Number,
    },
    targetpHMax: {
      type: Number,
    },
    estProductionTime: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: TIME_UNIT_OPTIONS, default: "hrs" },
    },
    phases: {
      type: [mbrPhaseSchema],
      default: [],
    },
    totalBatchWeight: {
      type: Number,
      default: 0,
    },
    productionSteps: {
      type: [productionStepSchema],
      default: [],
    },
    validationChecks: {
      type: [validationCheckSchema],
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

export const mbrModel = mongoose.model<IMbr>("Mbr", mbrSchema);
