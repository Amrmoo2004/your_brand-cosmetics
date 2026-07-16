import { IFormulaPhase } from "../modules/DB/models/formula.model.js";

interface BatchInput {
  batchSizeValue: number;
  batchSizeUnit: string;
  phases: IFormulaPhase[];
}

interface CalculatedPhase {
  phaseName: string;
  ingredients: {
    ingredientId: string;
    targetPercentage: number;
    calculatedWeight: number;
  }[];
  subtotal: number;
}

interface BatchResult {
  phases: CalculatedPhase[];
  totalBatchWeight: number;
}

/**
 * Converts batch size to grams for consistent internal calculation,
 * then converts results back to the original unit.
 */
const toGrams = (value: number, unit: string): number => {
  switch (unit) {
    case "kg":
      return value * 1000;
    case "g":
      return value;
    case "L":
      return value * 1000; // assuming density ≈ 1 g/mL for cosmetics
    case "mL":
      return value;
    default:
      return value;
  }
};

const fromGrams = (grams: number, unit: string): number => {
  switch (unit) {
    case "kg":
      return grams / 1000;
    case "g":
      return grams;
    case "L":
      return grams / 1000;
    case "mL":
      return grams;
    default:
      return grams;
  }
};

export const calculateBatchWeights = (input: BatchInput): BatchResult => {
  const batchInGrams = toGrams(input.batchSizeValue, input.batchSizeUnit);

  let totalBatchWeight = 0;
  const phases: CalculatedPhase[] = input.phases.map((phase) => {
    let subtotal = 0;

    const ingredients = phase.ingredients.map((ing) => {
      const weightInGrams = (ing.targetPercentage / 100) * batchInGrams;
      const weight = fromGrams(weightInGrams, input.batchSizeUnit);
      const rounded = Math.round(weight * 1000) / 1000; // 3 decimal precision

      subtotal += rounded;
      return {
        ingredientId: ing.ingredientId.toString(),
        targetPercentage: ing.targetPercentage,
        calculatedWeight: rounded,
      };
    });

    subtotal = Math.round(subtotal * 1000) / 1000;
    totalBatchWeight += subtotal;

    return {
      phaseName: phase.phaseName,
      ingredients,
      subtotal,
    };
  });

  totalBatchWeight = Math.round(totalBatchWeight * 1000) / 1000;

  return { phases, totalBatchWeight };
};
