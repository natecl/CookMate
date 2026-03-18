import type { Request, Response } from 'express';
import { getUserMealLogs, addNutrition } from '../services/mealLogService.js';

export const listMealLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await getUserMealLogs(req.user!.id, req.supabase!);
    res.status(200).json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch meal logs' });
  }
};

export const postNutrition = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { calories, protein_g, carbs_g, fats_g } = req.body;

    const nutrition = await addNutrition(id, { calories, protein_g, carbs_g, fats_g }, req.supabase!);
    res.status(201).json(nutrition);
  } catch {
    res.status(500).json({ error: 'Failed to add nutrition data' });
  }
};
