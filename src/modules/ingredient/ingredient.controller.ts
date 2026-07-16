import { Router } from "express";
import { ingredientService } from "./ingredient.services.js";
import { validation } from "../../middlewares/validaition.js";
import * as validations from "./ingredient.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  validation({ body: validations.createIngredientSchema }),
  ingredientService.create
);

router.get("/", protect, ingredientService.getAll);

router.get("/stats", protect, ingredientService.getStats);

router.get(
  "/:id",
  protect,
  validation({ params: validations.ingredientIdParamSchema }),
  ingredientService.getById
);

router.patch(
  "/:id",
  protect,
  validation({
    params: validations.ingredientIdParamSchema,
    body: validations.updateIngredientSchema,
  }),
  ingredientService.update
);

router.delete(
  "/:id",
  protect,
  validation({ params: validations.ingredientIdParamSchema }),
  ingredientService.delete
);

export default router;
