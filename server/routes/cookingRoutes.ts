import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  postCreateSession,
  getSessionById,
  postSessionEvent
} from '../controllers/cookingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 AI requests per 15 minutes
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post('/cooking/sessions', requireAuth, aiRateLimit, postCreateSession);
router.get('/cooking/sessions/:sessionId', requireAuth, getSessionById);
router.post('/cooking/sessions/:sessionId/events', requireAuth, postSessionEvent);

export default router;
