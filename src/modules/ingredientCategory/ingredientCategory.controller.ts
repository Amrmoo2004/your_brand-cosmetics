import { Router } from "express";
import { ingredientCategoryService } from "./ingredientCategory.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./ingredientCategory.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  validation({ body: validations.createCategorySchema }),
  ingredientCategoryService.create
);

router.get("/", protect, ingredientCategoryService.getAll);

router.get(
  "/:id",
  protect,
  validation({ params: validations.categoryIdParamSchema }),
  ingredientCategoryService.getById
);

router.patch(
  "/:id",
  protect,
  validation({
    params: validations.categoryIdParamSchema,
    body: validations.updateCategorySchema,
  }),
  ingredientCategoryService.update
);

router.delete(
  "/:id",
  protect,
  validation({ params: validations.categoryIdParamSchema }),
  ingredientCategoryService.delete
);

export default router;
