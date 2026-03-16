import type { Recipe } from '../../types/recipe';
import type { RecipeRequestBody } from '../../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:5000';
const RECIPE_URL = `${API_BASE_URL}/api/recipe`;

interface RequestRecipeParams {
  mode: RecipeRequestBody['mode'];
  inputValue: string;
  inputMethod?: string;
  ingredientsList?: string[];
}

const buildRequestBody = ({ mode, inputValue, inputMethod, ingredientsList }: RequestRecipeParams): RecipeRequestBody & { inputMethod?: string } => {
  if (mode === 'suggestion') {
    return {
      mode,
      data: { suggestion: inputValue }
    };
  }

  if (mode === 'import') {
    return {
      mode,
      data: { link: inputValue }
    };
  }

  return {
    mode,
    ...(inputMethod ? { inputMethod } : {}),
    data: { ingredients: Array.isArray(ingredientsList) ? ingredientsList : inputValue }
  };
};

export const requestRecipe = async ({ mode, inputValue, inputMethod, ingredientsList }: RequestRecipeParams): Promise<Recipe> => {
  const response = await fetch(RECIPE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildRequestBody({ mode, inputValue, inputMethod, ingredientsList }))
  });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const backendMessage = (payload as Record<string, string> | null)?.error || (payload as Record<string, string> | null)?.message;
    throw new Error(backendMessage || 'Recipe request failed');
  }

  return payload as unknown as Recipe;
};
