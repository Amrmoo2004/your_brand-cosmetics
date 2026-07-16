import mongoose, { Document, Schema } from "mongoose";

export interface IPhase extends Document {
  name: string;
  code: string;
  description?: string;
  assignedCategories: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
}

const phaseSchema = new Schema<IPhase>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "IngredientCategory",
      },
    ],
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

export const phaseModel = mongoose.model<IPhase>("Phase", phaseSchema);
