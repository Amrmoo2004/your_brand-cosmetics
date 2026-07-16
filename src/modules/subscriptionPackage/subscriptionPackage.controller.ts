import { Router } from "express";
import { subscriptionPackageService } from "./subscriptionPackage.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./subscriptionPackage.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

// Admins can create packages
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validation({ body: validations.createPackageSchema }),
  subscriptionPackageService.create
);

// Everyone (including users) can view packages to purchase
router.get("/", protect, subscriptionPackageService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.packageIdParamSchema }),
  subscriptionPackageService.getById
);

// Admins can update/delete
router.patch(
  "/:id",
  protect,
  restrictTo("admin"),
  validation({
    params: validations.packageIdParamSchema,
    body: validations.updatePackageSchema,
  }),
  subscriptionPackageService.update
);

router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  validation({ params: validations.packageIdParamSchema }),
  subscriptionPackageService.delete
);

export default router;
