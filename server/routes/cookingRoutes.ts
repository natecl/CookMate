import express from 'express';
import {
  postCreateSession,
  getSessionById,
  postSessionEvent
} from '../controllers/cookingController';

const router = express.Router();

router.post('/cooking/sessions', postCreateSession);
router.get('/cooking/sessions/:sessionId', getSessionById);
router.post('/cooking/sessions/:sessionId/events', postSessionEvent);

export default router;
