import type { Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin, createSupabaseClient } from '../services/supabaseClient.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
      supabase?: SupabaseClient;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired auth token' });
      return;
    }

    req.user = { id: data.user.id, email: data.user.email };
    req.supabase = createSupabaseClient(token);
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      req.user = { id: data.user.id, email: data.user.email };
      req.supabase = createSupabaseClient(token);
    }
  } catch {
    // Silently continue without auth
  }
  next();
};
