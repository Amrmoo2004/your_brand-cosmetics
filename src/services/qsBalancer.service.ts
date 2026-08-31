import { ingredientModel } from "../modules/DB/models/ingredient.model.js";

export interface PhaseIngredientInput {
  ingredientId: any;
  targetPercentage: number;
  calculatedWeight?: number;
}

export interface PhaseInput {
  phaseId?: any;
  phaseName: string;
  ingredients: PhaseIngredientInput[];
}

export interface QSBalanceResult {
  phases: PhaseInput[];
  balanced: boolean;
  qsIngredientName?: string;
  adjustedPercentage?: number;
  totalPercentage: number;
}

/**
 * Balances the formula by auto-adjusting the primary solvent (Water / Aqua / Solvent)
 * so that the total formula percentage equals exactly 100% (Quantum Satis - Q.S.).
 */
export const balanceFormulaQS = async (
  phases: PhaseInput[]
): Promise<QSBalanceResult> => {
  if (!phases || phases.length === 0) {
    return { phases: [], balanced: false, totalPercentage: 0 };
  }

  // Extract all unique ingredient IDs
  const allIngredientIds = phases
    .flatMap((p) => (p.ingredients || []).map((i) => i.ingredientId?.toString()))
    .filter(Boolean);

  if (allIngredientIds.length === 0) {
    return { phases, balanced: false, totalPercentage: 0 };
  }

  const ingredientDocs = await ingredientModel.find({
    _id: { $in: allIngredientIds },
  });

  const ingredientMap = new Map<string, any>();
  for (const doc of ingredientDocs) {
    ingredientMap.set(doc._id.toString(), doc);
  }

  // Find candidate Q.S. ingredient:
  // Priority 1: INCI or Commercial Name containing 'aqua', 'water', 'eau', 'deionized'
  // Priority 2: Primary function containing 'solvent'
  // Priority 3: First ingredient in a phase whose name contains 'water' or 'aqueous'
  let qsCandidate: { phaseIndex: number; ingIndex: number; name: string } | null = null;

  for (let pIdx = 0; pIdx < phases.length; pIdx++) {
    const phase = phases[pIdx];
    if (!phase || !phase.ingredients) continue;

    for (let iIdx = 0; iIdx < phase.ingredients.length; iIdx++) {
      const ing = phase.ingredients[iIdx];
      if (!ing) continue;

      const doc = ingredientMap.get(ing.ingredientId?.toString());
      if (!doc) continue;

      const inci = (doc.inciName || "").toLowerCase();
      const comm = (doc.commercialName || "").toLowerCase();
      const fn = (doc.primaryFunction || "").toLowerCase();

      if (
        inci.includes("aqua") ||
        inci.includes("water") ||
        inci.includes("eau") ||
        comm.includes("aqua") ||
        comm.includes("water")
      ) {
        qsCandidate = { phaseIndex: pIdx, ingIndex: iIdx, name: doc.commercialName };
        break;
      }

      if (!qsCandidate && fn.includes("solvent")) {
        qsCandidate = { phaseIndex: pIdx, ingIndex: iIdx, name: doc.commercialName };
      }
    }
    if (
      qsCandidate &&
      (qsCandidate.name.toLowerCase().includes("water") ||
        qsCandidate.name.toLowerCase().includes("aqua"))
    ) {
      break;
    }
  }

  // Fallback: check if there is a phase named Water / Aqueous / Phase A
  if (!qsCandidate) {
    for (let pIdx = 0; pIdx < phases.length; pIdx++) {
      const phase = phases[pIdx];
      if (!phase || !phase.ingredients || phase.ingredients.length === 0) continue;

      const pName = (phase.phaseName || "").toLowerCase();
      if (pName.includes("water") || pName.includes("aqueous") || pName.includes("phase a")) {
        const firstIng = phase.ingredients[0];
        if (firstIng) {
          const doc = ingredientMap.get(firstIng.ingredientId?.toString());
          qsCandidate = {
            phaseIndex: pIdx,
            ingIndex: 0,
            name: doc ? doc.commercialName : "Primary Solvent",
          };
          break;
        }
      }
    }
  }

  // Deep clone phases to avoid unwanted mutations
  const updatedPhases: PhaseInput[] = phases.map((p) => ({
    ...p,
    ingredients: (p.ingredients || []).map((i) => ({ ...i })),
  }));

  // Calculate sum of non-Q.S. ingredients
  let sumOther = 0;
  for (let pIdx = 0; pIdx < updatedPhases.length; pIdx++) {
    const phase = updatedPhases[pIdx];
    if (!phase || !phase.ingredients) continue;

    for (let iIdx = 0; iIdx < phase.ingredients.length; iIdx++) {
      if (qsCandidate && qsCandidate.phaseIndex === pIdx && qsCandidate.ingIndex === iIdx) {
        continue;
      }
      const ing = phase.ingredients[iIdx];
      if (ing) {
        sumOther += ing.targetPercentage || 0;
      }
    }
  }

  sumOther = Math.round(sumOther * 1000) / 1000;

  if (qsCandidate && sumOther <= 100) {
    const qsPercentage = Math.round((100 - sumOther) * 1000) / 1000;
    const targetPhase = updatedPhases[qsCandidate.phaseIndex];
    const targetIng = targetPhase?.ingredients?.[qsCandidate.ingIndex];
    if (targetIng) {
      targetIng.targetPercentage = qsPercentage;
    }

    return {
      phases: updatedPhases,
      balanced: true,
      qsIngredientName: qsCandidate.name,
      adjustedPercentage: qsPercentage,
      totalPercentage: 100,
    };
  }

  // If no Q.S. candidate or sumOther > 100, calculate actual total
  const currentTotal = phases.reduce(
    (sum, p) =>
      sum +
      (p.ingredients || []).reduce(
        (s, i) => s + (i.targetPercentage || 0),
        0
      ),
    0
  );

  return {
    phases: updatedPhases,
    balanced: false,
    totalPercentage: Math.round(currentTotal * 1000) / 1000,
  };
};
