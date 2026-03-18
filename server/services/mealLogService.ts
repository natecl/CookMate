import type { SupabaseClient } from '@supabase/supabase-js';

interface MealLog {
  id: string;
  user_id: string;
  recipe_id: string;
  session_id: string | null;
  cooked_at: string;
  notes: string | null;
  created_at: string;
}

interface Nutrition {
  id: string;
  meal_log_id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  created_at: string;
}

interface MealLogWithNutrition extends MealLog {
  nutrition: Nutrition[];
}

interface NutritionInput {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

export const logMeal = async (
  userId: string,
  recipeId: string,
  sessionId: string | null,
  supabase: SupabaseClient
): Promise<MealLog> => {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      recipe_id: recipeId,
      session_id: sessionId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to log meal: ${error.message}`);
  return data as MealLog;
};

export const getUserMealLogs = async (
  userId: string,
  supabase: SupabaseClient
): Promise<MealLogWithNutrition[]> => {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*, nutrition(*)')
    .eq('user_id', userId)
    .order('cooked_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch meal logs: ${error.message}`);
  return (data ?? []) as MealLogWithNutrition[];
};

export const addNutrition = async (
  mealLogId: string,
  macros: NutritionInput,
  supabase: SupabaseClient
): Promise<Nutrition> => {
  const { data, error } = await supabase
    .from('nutrition')
    .insert({
      meal_log_id: mealLogId,
      calories: macros.calories ?? null,
      protein_g: macros.protein_g ?? null,
      carbs_g: macros.carbs_g ?? null,
      fats_g: macros.fats_g ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add nutrition: ${error.message}`);
  return data as Nutrition;
};
