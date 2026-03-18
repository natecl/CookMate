import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe } from '../../types/recipe.js';

interface StoredRecipe extends Recipe {
  id: string;
  user_id: string;
  source_mode: string | null;
  created_at: string;
  updated_at: string;
}

export const saveRecipe = async (
  recipe: Recipe,
  userId: string,
  sourceMode: string | null,
  supabase: SupabaseClient
): Promise<StoredRecipe> => {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: userId,
      recipe_name: recipe.recipe_name,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      source_mode: sourceMode,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save recipe: ${error.message}`);
  return data as StoredRecipe;
};

export const getUserRecipes = async (
  userId: string,
  supabase: SupabaseClient
): Promise<StoredRecipe[]> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch recipes: ${error.message}`);
  return (data ?? []) as StoredRecipe[];
};

export const getRecipeById = async (
  recipeId: string,
  supabase: SupabaseClient
): Promise<StoredRecipe | null> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch recipe: ${error.message}`);
  }
  return data as StoredRecipe;
};

export const deleteRecipe = async (
  recipeId: string,
  supabase: SupabaseClient
): Promise<void> => {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);

  if (error) throw new Error(`Failed to delete recipe: ${error.message}`);
};
