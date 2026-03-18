import type { Request, Response } from 'express';
import { getUserRecipes, getRecipeById, deleteRecipe } from '../services/recipeStorageService.js';

export const listRecipes = async (req: Request, res: Response): Promise<void> => {
  try {
    const recipes = await getUserRecipes(req.user!.id, req.supabase!);
    res.status(200).json(recipes);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

export const getRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const recipe = await getRecipeById((req.params.id as string), req.supabase!);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.status(200).json(recipe);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

export const removeRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteRecipe((req.params.id as string), req.supabase!);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
};
