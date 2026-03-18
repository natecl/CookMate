import express from 'express';
import rateLimit from 'express-rate-limit';
import { getHealth, postRecipe } from '../controllers/healthController.js';
import { postVisionIngredients } from '../controllers/visionController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 AI requests per 15 minutes
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.get('/health', getHealth);
router.post('/recipe', optionalAuth, aiRateLimit, postRecipe);
router.post('/vision/ingredients', postVisionIngredients);

export default router;
