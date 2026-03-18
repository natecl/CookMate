import express from 'express';
import { listRecipes, getRecipe, removeRecipe } from '../controllers/recipeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/recipes', requireAuth, listRecipes);
router.get('/recipes/:id', requireAuth, getRecipe);
router.delete('/recipes/:id', requireAuth, removeRecipe);

export default router;
