import type { Request, Response } from 'express';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await req.supabase!
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
      return;
    }

    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { display_name } = req.body;

    if (typeof display_name !== 'string' || display_name.trim().length === 0) {
      res.status(400).json({ error: 'display_name must be a non-empty string' });
      return;
    }

    const { data, error } = await req.supabase!
      .from('profiles')
      .update({ display_name: display_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update profile' });
      return;
    }

    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
