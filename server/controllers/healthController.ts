import type { Request, Response } from 'express';
import { processRecipeRequest, RecipeRequestError } from '../services/recipeService';
import { saveRecipe } from '../services/recipeStorageService.js';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'success',
    message: 'frontend and backend connected',
  });
};

export const postRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const recipe = await processRecipeRequest(req.body);

    if (req.user) {
      const mode = (req.body as Record<string, unknown>)?.mode as string | null;
      saveRecipe(recipe, req.user.id, mode ?? null, req.supabase!).catch((err) => {
        console.error('Failed to persist recipe:', err);
      });
    }

    res.status(200).json(recipe);
  } catch (error) {
    if (error instanceof RecipeRequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Recipe generation failed' });
  }
};
