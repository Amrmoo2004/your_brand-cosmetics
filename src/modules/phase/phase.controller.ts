import { Router } from "express";
import { phaseService } from "./phase.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./phase.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  validation({ body: validations.createPhaseSchema }),
  phaseService.create
);

router.get("/", protect, phaseService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.phaseIdParamSchema }),
  phaseService.getById
);

router.patch(
  "/:id",
  protect,
  validation({
    params: validations.phaseIdParamSchema,
    body: validations.updatePhaseSchema,
  }),
  phaseService.update
);

router.delete(
  "/:id",
  protect,
  validation({ params: validations.phaseIdParamSchema }),
  phaseService.delete
);

export default router;
