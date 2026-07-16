import { Router } from "express";
import { mbrService } from "./mbr.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./mbr.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  validation({ body: validations.createMbrSchema }),
  mbrService.create
);

router.get("/", protect, mbrService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.mbrIdParamSchema }),
  mbrService.getById
);

router.patch(
  "/:id",
  protect,
  validation({
    params: validations.mbrIdParamSchema,
    body: validations.updateMbrSchema,
  }),
  mbrService.saveProgress
);

router.delete(
  "/:id",
  protect,
  validation({ params: validations.mbrIdParamSchema }),
  mbrService.delete
);

export default router;
