import { Router } from "express";
import { formulaService } from "./formula.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./formula.validation.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/from-template/:templateId", protect, formulaService.createFromTemplate);

router.post(
  "/",
  protect,
  restrictTo("admin"),
  validation({ body: validations.createFormulaSchema }),
  formulaService.create
);

router.get("/", protect, formulaService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.getById
);

router.patch(
  "/:id",
  protect,
  validation({
    params: validations.formulaIdParamSchema,
    body: validations.updateFormulaSchema,
  }),
  formulaService.update
);

router.patch(
  "/:id/status",
  protect,
  validation({
    params: validations.formulaIdParamSchema,
    body: validations.updateFormulaStatusSchema,
  }),
  formulaService.updateStatus
);

router.get(
  "/:id/validate",
  protect,
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.validate
);

router.delete(
  "/:id",
  protect,
  validation({ params: validations.formulaIdParamSchema }),
  formulaService.delete
);

export default router;
