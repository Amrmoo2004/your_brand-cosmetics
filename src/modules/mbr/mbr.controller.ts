import { Router } from "express";
import { mbrService } from "./mbr.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./mbr.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireActiveSubscription } from "../../middlewares/subscription.middleware.js";

const router = Router();

// Apply authentication and active subscription check to all MBR routes
router.use(protect);
router.use(requireActiveSubscription);

router.post(
  "/",
  validation({ body: validations.createMbrSchema }),
  mbrService.create
);

router.get("/", mbrService.getAll);

router.get(
  "/:id",
  validation({ params: validations.mbrIdParamSchema }),
  mbrService.getById
);

router.patch(
  "/:id",
  validation({
    params: validations.mbrIdParamSchema,
    body: validations.updateMbrSchema,
  }),
  mbrService.saveProgress
);

router.delete(
  "/:id",
  validation({ params: validations.mbrIdParamSchema }),
  mbrService.delete
);

export default router;
