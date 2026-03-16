import express from 'express';
import { postRecipe } from '../controllers/healthController';
import { postVisionIngredients } from '../controllers/visionController';

const router = express.Router();

router.post('/recipe', postRecipe);
router.post('/vision/ingredients', postVisionIngredients);

export default router;
