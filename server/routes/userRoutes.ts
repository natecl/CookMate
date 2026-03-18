import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user/profile', requireAuth, getProfile);
router.patch('/user/profile', requireAuth, updateProfile);

export default router;
