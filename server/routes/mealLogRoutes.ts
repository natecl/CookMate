import express from 'express';
import { listMealLogs, postNutrition } from '../controllers/mealLogController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/meal-logs', requireAuth, listMealLogs);
router.post('/meal-logs/:id/nutrition', requireAuth, postNutrition);

export default router;
