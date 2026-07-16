import { ingredientModel, IIngredient } from "../modules/DB/models/ingredient.model.js";
import { IValidationCheck } from "../modules/DB/models/mbr.model.js";

interface PhaseInput {
  phaseName: string;
  ingredients: {
    ingredientId: string;
    targetPercentage: number;
  }[];
}

interface ValidationInput {
  targetpHMin?: number | undefined;
  targetpHMax?: number | undefined;
  phases: PhaseInput[];
}

export const validateFormula = async (
  input: ValidationInput
): Promise<IValidationCheck[]> => {
  const checks: IValidationCheck[] = [];
  let checkCounter = 1;

  // ── 1. Total Percentage = 100% ─────────────────────────────────────────
  const totalPercentage = input.phases.reduce(
    (sum, phase) =>
      sum + phase.ingredients.reduce((s, ing) => s + ing.targetPercentage, 0),
    0
  );

  const roundedTotal = Math.round(totalPercentage * 100) / 100;

  if (roundedTotal === 100) {
    checks.push({
      id: `CHK-${checkCounter++}`,
      name: "Total formula equals 100%",
      status: "success",
      message: `Total formula percentage is ${roundedTotal}%.`,
    });
  } else if (roundedTotal < 100) {
    checks.push({
      id: `CHK-${checkCounter++}`,
      name: "Total formula equals 100%",
      status: "warning",
      message: `Formula is under target: ${roundedTotal}%. Missing ${(100 - roundedTotal).toFixed(2)}%.`,
    });
  } else {
    checks.push({
      id: `CHK-${checkCounter++}`,
      name: "Total formula equals 100%",
      status: "error",
      message: `Formula exceeds 100%: currently ${roundedTotal}%. Reduce by ${(roundedTotal - 100).toFixed(2)}%.`,
    });
  }

  // ── 2. Collect all ingredient IDs for a single DB query ────────────────
  const allIngredientIds = input.phases.flatMap((p) =>
    p.ingredients.map((i) => i.ingredientId)
  );

  const ingredientDocs = await ingredientModel.find({
    _id: { $in: allIngredientIds },
  });

  const ingredientMap = new Map<string, IIngredient>();
  for (const doc of ingredientDocs) {
    ingredientMap.set(doc._id.toString(), doc);
  }

  // ── 3. Per-ingredient concentration range check ────────────────────────
  let allInRange = true;

  for (const phase of input.phases) {
    for (const ing of phase.ingredients) {
      const doc = ingredientMap.get(ing.ingredientId);
      if (!doc) continue;

      const { minPercentage, maxPercentage } = doc.usageGuidelines;

      if (ing.targetPercentage > maxPercentage) {
        allInRange = false;
        checks.push({
          id: `CHK-${checkCounter++}`,
          name: `${doc.commercialName} exceeds max concentration`,
          status: "error",
          message: `${doc.commercialName} is at ${ing.targetPercentage}% but max allowed is ${maxPercentage}%.`,
        });
      } else if (ing.targetPercentage < minPercentage) {
        allInRange = false;
        checks.push({
          id: `CHK-${checkCounter++}`,
          name: `${doc.commercialName} below min concentration`,
          status: "warning",
          message: `${doc.commercialName} is at ${ing.targetPercentage}% but min recommended is ${minPercentage}%.`,
        });
      }
    }
  }

  if (allInRange) {
    checks.push({
      id: `CHK-${checkCounter++}`,
      name: "Recommended conc. range within specification",
      status: "success",
      message: "All ingredients are within their recommended concentration ranges.",
    });
  }

  // ── 4. pH Range compatibility check ────────────────────────────────────
  if (input.targetpHMin != null && input.targetpHMax != null) {
    const phIncompatible: string[] = [];

    for (const phase of input.phases) {
      for (const ing of phase.ingredients) {
        const doc = ingredientMap.get(ing.ingredientId);
        if (!doc) continue;

        const { pHMin, pHMax } = doc.usageGuidelines;
        // ingredient pH range must overlap with formula target pH
        if (pHMax < input.targetpHMin || pHMin > input.targetpHMax) {
          phIncompatible.push(doc.commercialName);
        }
      }
    }

    if (phIncompatible.length === 0) {
      checks.push({
        id: `CHK-${checkCounter++}`,
        name: "pH range compatibility",
        status: "success",
        message: "All ingredients are compatible with the target pH range.",
      });
    } else {
      checks.push({
        id: `CHK-${checkCounter++}`,
        name: "pH range compatibility",
        status: "warning",
        message: `The following ingredients may not be stable at target pH: ${phIncompatible.join(", ")}.`,
      });
    }
  }

  // ── 5. Solubility compatibility (Water vs Oil phase) ───────────────────
  const solubilityIssues: string[] = [];

  for (const phase of input.phases) {
    const phaseNameLower = phase.phaseName.toLowerCase();

    for (const ing of phase.ingredients) {
      const doc = ingredientMap.get(ing.ingredientId);
      if (!doc) continue;

      const solubility = doc.usageGuidelines.solubility;

      if (phaseNameLower.includes("water") && solubility === "Oil Soluble") {
        solubilityIssues.push(
          `${doc.commercialName} (Oil Soluble) in ${phase.phaseName}`
        );
      } else if (
        phaseNameLower.includes("oil") &&
        solubility === "Water Soluble"
      ) {
        solubilityIssues.push(
          `${doc.commercialName} (Water Soluble) in ${phase.phaseName}`
        );
      }
    }
  }

  if (solubilityIssues.length === 0) {
    checks.push({
      id: `CHK-${checkCounter++}`,
      name: "Solubility compatibility",
      status: "success",
      message: "All ingredients are in compatible phases based on solubility.",
    });
  } else {
    for (const issue of solubilityIssues) {
      checks.push({
        id: `CHK-${checkCounter++}`,
        name: "Solubility incompatibility",
        status: "error",
        message: `Incompatible placement: ${issue}.`,
      });
    }
  }

  return checks;
};
