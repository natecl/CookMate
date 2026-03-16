import type { Request, Response } from 'express';
import { detectIngredientsFromImage } from '../services/vision/ingredientVisionService';

export const postVisionIngredients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { image } = req.body || {};
    const ingredients = await detectIngredientsFromImage(image);
    res.status(200).json({ ingredients });
  } catch (_error) {
    res.status(500).json({ error: 'Ingredient detection failed' });
  }
};
