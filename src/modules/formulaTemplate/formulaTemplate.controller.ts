import { Router } from "express";
import { formulaTemplateService } from "./formulaTemplate.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./formulaTemplate.validation.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

// Admins can create templates
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validation({ body: validations.createTemplateSchema }),
  formulaTemplateService.create
);

// Everyone can view templates (service filters by purchased packages for normal users)
router.get("/", protect, formulaTemplateService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.templateIdParamSchema }),
  formulaTemplateService.getById
);

// Admins can update/delete
router.patch(
  "/:id",
  protect,
  restrictTo("admin"),
  validation({
    params: validations.templateIdParamSchema,
    body: validations.updateTemplateSchema,
  }),
  formulaTemplateService.update
);

router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  validation({ params: validations.templateIdParamSchema }),
  formulaTemplateService.delete
);

export default router;
