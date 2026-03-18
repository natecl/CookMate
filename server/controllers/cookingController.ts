import type { Request, Response } from 'express';
import {
  createSession,
  getSession,
  sendEvent,
  CookingSessionError
} from '../services/cookingSessionService.js';

export const postCreateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipe } = req.body || {};
    const session = await createSession(recipe, req.user!.id, req.supabase!);
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof CookingSessionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create cooking session' });
  }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = await getSession(sessionId, req.supabase!);
    if (!session) {
      res.status(404).json({ error: 'Cooking session not found' });
      return;
    }
    res.status(200).json(session);
  } catch (error) {
    if (error instanceof CookingSessionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch cooking session' });
  }
};

export const postSessionEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const event = req.body;

    const updatedSession = await sendEvent(sessionId, event, req.user!.id, req.supabase!);

    res.status(200).json(updatedSession);
  } catch (error) {
    if (error instanceof CookingSessionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to process cooking event' });
  }
};
