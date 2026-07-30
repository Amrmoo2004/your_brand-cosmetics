import { Router } from "express";
import { formulaService } from "./formula.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./formula.validation.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
import { requireActiveSubscription } from "../../middlewares/subscription.middleware.js";

const router = Router();

// Apply authentication and active subscription check to all formula routes
router.use(protect);
router.use(requireActiveSubscription);

router.post("/from-template/:templateId", formulaService.createFromTemplate);

router.post(
  "/",
  restrictTo("admin"),
  validation({ body: validations.createFormulaSchema }),
  formulaService.create
);

router.get("/", formulaService.getAll);

router.get(
  "/:id",
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.getById
);

router.patch(
  "/:id",
  validation({
    params: validations.formulaIdParamSchema,
    body: validations.updateFormulaSchema,
  }),
  formulaService.update
);

router.patch(
  "/:id/status",
  validation({
    params: validations.formulaIdParamSchema,
    body: validations.updateFormulaStatusSchema,
  }),
  formulaService.updateStatus
);

router.get(
  "/:id/validate",
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.validate
);

router.delete(
  "/:id",
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.delete
);

export default router;
