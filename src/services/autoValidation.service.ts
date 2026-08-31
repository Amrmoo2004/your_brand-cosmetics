import { ingredientModel, IIngredient } from "../modules/DB/models/ingredient.model.js";
import { formulaTemplateModel } from "../modules/DB/models/formulaTemplate.model.js";
import { IValidationCheck } from "../modules/DB/models/mbr.model.js";

interface PhaseInput {
  phaseName: string;
  ingredients: {
    ingredientId: any;
    targetPercentage: number;
  }[];
}

interface ValidationInput {
  targetpHMin?: number | undefined;
  targetpHMax?: number | undefined;
  phases: PhaseInput[];
}

export const validateFormula = async (
  input: ValidationInput,
  templateId?: string
): Promise<IValidationCheck[]> => {
  const checks: IValidationCheck[] = [];
  let checkCounter = 1;

  // ── 1. Total Percentage = 100% ─────────────────────────────────────────
  const totalPercentage = input.phases.reduce(
    (sum, phase) =>
      sum + phase.ingredients.reduce((s, ing) => s + (ing.targetPercentage || 0), 0),
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
  const allIngredientIds = input.phases
    .flatMap((p) => p.ingredients.map((i) => i.ingredientId?.toString()))
    .filter(Boolean);

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
      const doc = ingredientMap.get(ing.ingredientId?.toString());
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
        const doc = ingredientMap.get(ing.ingredientId?.toString());
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
      const doc = ingredientMap.get(ing.ingredientId?.toString());
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

  // ── 6. Advanced Template Constraints (Category items, Category Percentages) ─
  if (templateId) {
    const template = await formulaTemplateModel.findById(templateId).lean();
    if (template) {
      for (const phase of input.phases) {
        const templatePhase = template.phases.find(p => p.phaseName === phase.phaseName);
        if (!templatePhase) continue;

        if (templatePhase.allowedCategories && templatePhase.allowedCategories.length > 0) {
           // Group user's ingredients by their categoryId
           const ingredientsByCategory = new Map<string, typeof phase.ingredients>();
           for (const ing of phase.ingredients) {
             const doc = ingredientMap.get(ing.ingredientId?.toString());
             if (!doc) continue;
             const catId = doc.categoryId.toString();
             if (!ingredientsByCategory.has(catId)) {
               ingredientsByCategory.set(catId, []);
             }
             ingredientsByCategory.get(catId)!.push(ing);
           }

           for (const allowedCat of templatePhase.allowedCategories) {
             const catId = allowedCat.categoryId.toString();
             const catIngredients = ingredientsByCategory.get(catId) || [];
             const catCount = catIngredients.length;

             // Check min/max items per category
             if (allowedCat.minItems !== undefined && catCount < allowedCat.minItems) {
               checks.push({
                 id: `CHK-${checkCounter++}`,
                 name: `${phase.phaseName} category items count`,
                 status: "error",
                 message: `Please select at least ${allowedCat.minItems} ingredient(s) from category in ${phase.phaseName}.`,
               });
             }
             if (allowedCat.maxItems !== undefined && catCount > allowedCat.maxItems) {
               checks.push({
                 id: `CHK-${checkCounter++}`,
                 name: `${phase.phaseName} category items count`,
                 status: "error",
                 message: `You can select a maximum of ${allowedCat.maxItems} ingredient(s) from category in ${phase.phaseName}.`,
               });
             }

             // Check category total percentage
             const totalCategoryPercentage = catIngredients.reduce((sum, i) => sum + (i.targetPercentage || 0), 0);
             if (allowedCat.minPercentage !== undefined && totalCategoryPercentage < allowedCat.minPercentage) {
               checks.push({
                 id: `CHK-${checkCounter++}`,
                 name: `Category total percentage below minimum`,
                 status: "error",
                 message: `Total percentage for category in ${phase.phaseName} is ${totalCategoryPercentage}%, but minimum required is ${allowedCat.minPercentage}%.`,
               });
             }
             if (allowedCat.maxPercentage !== undefined && totalCategoryPercentage > allowedCat.maxPercentage) {
               checks.push({
                 id: `CHK-${checkCounter++}`,
                 name: `Category total percentage exceeds maximum`,
                 status: "error",
                 message: `Total percentage for category in ${phase.phaseName} is ${totalCategoryPercentage}%, but maximum allowed is ${allowedCat.maxPercentage}%.`,
               });
             }

             // Check percentage per item
             for (const ing of catIngredients) {
               const doc = ingredientMap.get(ing.ingredientId?.toString());
               if (!doc) continue;

               if (ing.targetPercentage < allowedCat.minPercentagePerItem) {
                 checks.push({
                   id: `CHK-${checkCounter++}`,
                   name: `${doc.commercialName} below template minimum`,
                   status: "error",
                   message: `${doc.commercialName} is at ${ing.targetPercentage}% but template requires at least ${allowedCat.minPercentagePerItem}%.`,
                 });
               }
               if (ing.targetPercentage > allowedCat.maxPercentagePerItem) {
                 checks.push({
                   id: `CHK-${checkCounter++}`,
                   name: `${doc.commercialName} exceeds template maximum`,
                   status: "error",
                   message: `${doc.commercialName} is at ${ing.targetPercentage}% but template allows maximum ${allowedCat.maxPercentagePerItem}%.`,
                 });
               }
             }
           }

           // Check for unauthorized categories
           for (const ing of phase.ingredients) {
             const doc = ingredientMap.get(ing.ingredientId?.toString());
             if (!doc) continue;
             const allowedCat = templatePhase.allowedCategories.find(c => c.categoryId.toString() === doc.categoryId.toString());
             if (!allowedCat) {
               checks.push({
                 id: `CHK-${checkCounter++}`,
                 name: "Unauthorized Category",
                 status: "error",
                 message: `Ingredient ${doc.commercialName} is not allowed in ${phase.phaseName}.`,
               });
             }
           }
        }
      }

      // ── 7. Legacy Dynamic Compatibility Rules (Template Rule Engine) ──────────────
      if (template.compatibilityRules && template.compatibilityRules.length > 0) {
        const usedCategoryIds = new Set<string>();
        const categoryPhaseMap = new Map<string, Set<string>>();

        for (const phase of input.phases) {
          for (const ing of phase.ingredients) {
            const doc = ingredientMap.get(ing.ingredientId?.toString());
            if (doc && doc.categoryId) {
              const catId = doc.categoryId.toString();
              usedCategoryIds.add(catId);

              if (!categoryPhaseMap.has(catId)) {
                categoryPhaseMap.set(catId, new Set());
              }
              categoryPhaseMap.get(catId)!.add(phase.phaseName);
            }
          }
        }

        let allRulesPassed = true;

        for (const rule of template.compatibilityRules) {
          const conditionCatId = rule.conditionCategory.toString();
          const hasCondition = usedCategoryIds.has(conditionCatId);

          if (!hasCondition) continue; 

          switch (rule.ruleType) {
            case "REQUIRE_CATEGORY": {
              if (!rule.requiredCategory) break;
              const hasRequired = usedCategoryIds.has(rule.requiredCategory.toString());
              if (!hasRequired) {
                allRulesPassed = false;
                checks.push({
                  id: `CHK-${checkCounter++}`,
                  name: "Template Rule Violation",
                  status: rule.severity,
                  message: rule.errorMessage,
                });
              }
              break;
            }

            case "RESTRICT_COMBINATION": {
              if (!rule.restrictedCategory) break;
              const hasRestricted = usedCategoryIds.has(rule.restrictedCategory.toString());
              if (hasRestricted) {
                allRulesPassed = false;
                checks.push({
                  id: `CHK-${checkCounter++}`,
                  name: "Template Rule Violation",
                  status: rule.severity,
                  message: rule.errorMessage,
                });
              }
              break;
            }

            case "REQUIRE_PHASE": {
              if (!rule.requiredPhaseName) break;
              const phasesWithCategory = categoryPhaseMap.get(conditionCatId);
              const isInCorrectPhase = phasesWithCategory?.has(rule.requiredPhaseName);
              const isOnlyInCorrectPhase =
                phasesWithCategory?.size === 1 && isInCorrectPhase;
              if (!isOnlyInCorrectPhase) {
                allRulesPassed = false;
                checks.push({
                  id: `CHK-${checkCounter++}`,
                  name: "Template Rule Violation",
                  status: rule.severity,
                  message: rule.errorMessage,
                });
              }
              break;
            }
          }
        }

        if (allRulesPassed) {
          checks.push({
            id: `CHK-${checkCounter++}`,
            name: "Template compatibility rules",
            status: "success",
            message: "All template compatibility rules passed.",
          });
        }
      }
    }
  }

  return checks;
};

