import type { Request, Response } from 'express';
import {
  createSession,
  getSession,
  sendEvent,
  CookingSessionError
} from '../services/cookingSessionService';

export const postCreateSession = (req: Request, res: Response): void => {
  try {
    const { recipe } = req.body || {};
    const session = createSession(recipe);
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof CookingSessionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create cooking session' });
  }
};

export const getSessionById = (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Cooking session not found' });
    return;
  }
  res.status(200).json(session);
};

export const postSessionEvent = (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.params;
    const event = req.body;

    const updatedSession = sendEvent(sessionId, event);

    res.status(200).json(updatedSession);
  } catch (error) {
    if (error instanceof CookingSessionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to process cooking event' });
  }
};
