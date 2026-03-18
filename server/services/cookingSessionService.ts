import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CookingSessionError } from '../../types/errors.js';
import type { SessionStatus, SessionEventType, CookingSession } from '../../types/session.js';
import type { Recipe } from '../../types/recipe.js';
import { saveRecipe } from './recipeStorageService.js';
import { logMeal } from './mealLogService.js';

interface SessionEvent {
  type: string;
  stepIndex?: number;
}

type TransitionResult = CookingSession | { error: string };

const VALID_TRANSITIONS: Record<SessionStatus, SessionEventType[]> = {
  idle: ['START_COOKING'],
  active: ['NEXT_STEP', 'PREVIOUS_STEP', 'MARK_STEP_COMPLETE', 'GO_TO_STEP', 'PAUSE_SESSION', 'FINISH_SESSION', 'RESET_SESSION'],
  paused: ['RESUME_SESSION', 'RESET_SESSION', 'FINISH_SESSION'],
  completed: ['RESET_SESSION']
};

const transition = (session: CookingSession, event: SessionEvent): TransitionResult => {
  const { type } = event;
  const allowed: string[] = VALID_TRANSITIONS[session.status] || [];

  if (!allowed.includes(type)) {
    return { error: `Event "${type}" is not valid in status "${session.status}"` };
  }

  const now = new Date().toISOString();
  const totalSteps = session.recipe.instructions.length;

  switch (type) {
    case 'START_COOKING':
      return {
        ...session,
        status: 'active',
        currentStepIndex: 0,
        stepCompletion: session.recipe.instructions.map(() => false),
        updatedAt: now
      };

    case 'NEXT_STEP': {
      const nextIndex = Math.min(session.currentStepIndex + 1, totalSteps - 1);
      return { ...session, currentStepIndex: nextIndex, updatedAt: now };
    }

    case 'PREVIOUS_STEP': {
      const prevIndex = Math.max(session.currentStepIndex - 1, 0);
      const newCompletion = [...session.stepCompletion];
      newCompletion[prevIndex] = false;
      return {
        ...session,
        currentStepIndex: prevIndex,
        stepCompletion: newCompletion,
        updatedAt: now
      };
    }

    case 'MARK_STEP_COMPLETE': {
      const newCompletion = [...session.stepCompletion];
      newCompletion[session.currentStepIndex] = true;
      let nextIndex = session.currentStepIndex;
      if (session.currentStepIndex < totalSteps - 1) {
        nextIndex = session.currentStepIndex + 1;
      }
      return {
        ...session,
        stepCompletion: newCompletion,
        currentStepIndex: nextIndex,
        updatedAt: now
      };
    }

    case 'GO_TO_STEP': {
      const target = event.stepIndex;
      if (typeof target !== 'number' || target < 0 || target >= totalSteps) {
        return { error: `Invalid stepIndex: ${target}` };
      }
      return { ...session, currentStepIndex: target, updatedAt: now };
    }

    case 'PAUSE_SESSION':
      return { ...session, status: 'paused', updatedAt: now };

    case 'RESUME_SESSION':
      return { ...session, status: 'active', updatedAt: now };

    case 'FINISH_SESSION':
      return { ...session, status: 'completed', updatedAt: now };

    case 'RESET_SESSION':
      return {
        ...session,
        status: 'idle',
        currentStepIndex: 0,
        stepCompletion: session.recipe.instructions.map(() => false),
        updatedAt: now
      };

    default:
      return { error: `Unknown event type: ${type}` };
  }
};

const validateRecipe = (recipe: Recipe): void => {
  if (!recipe || typeof recipe !== 'object') {
    throw new CookingSessionError('Recipe is required', 400);
  }
  if (!recipe.recipe_name || typeof recipe.recipe_name !== 'string') {
    throw new CookingSessionError('recipe_name must be a non-empty string', 400);
  }
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new CookingSessionError('ingredients must be a non-empty array', 400);
  }
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    throw new CookingSessionError('instructions must be a non-empty array', 400);
  }
};

export const createSession = async (
  recipe: Recipe,
  userId: string,
  supabase: SupabaseClient
): Promise<CookingSession> => {
  validateRecipe(recipe);

  const storedRecipe = await saveRecipe(recipe, userId, null, supabase);

  const now = new Date().toISOString();
  const sessionId = `cook_${crypto.randomUUID()}`;
  const stepCompletion = recipe.instructions.map(() => false);

  const { data, error } = await supabase
    .from('cooking_sessions')
    .insert({
      id: sessionId,
      user_id: userId,
      recipe_id: storedRecipe.id,
      current_step_index: 0,
      step_completion: stepCompletion,
      status: 'idle',
    })
    .select()
    .single();

  if (error) {
    throw new CookingSessionError(`Failed to create session: ${error.message}`, 500);
  }

  return {
    sessionId: data.id,
    recipeId: storedRecipe.id,
    recipe,
    currentStepIndex: data.current_step_index,
    stepCompletion: data.step_completion,
    status: data.status as SessionStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const getSession = async (
  sessionId: string,
  supabase: SupabaseClient
): Promise<CookingSession | null> => {
  const { data, error } = await supabase
    .from('cooking_sessions')
    .select('*, recipes(*)')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new CookingSessionError(`Failed to fetch session: ${error.message}`, 500);
  }

  const recipeRow = data.recipes;

  return {
    sessionId: data.id,
    recipeId: recipeRow.id,
    recipe: {
      recipe_name: recipeRow.recipe_name,
      ingredients: recipeRow.ingredients,
      instructions: recipeRow.instructions,
    },
    currentStepIndex: data.current_step_index,
    stepCompletion: data.step_completion,
    status: data.status as SessionStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const sendEvent = async (
  sessionId: string,
  event: SessionEvent,
  userId: string,
  supabase: SupabaseClient
): Promise<CookingSession> => {
  if (!event || typeof event.type !== 'string') {
    throw new CookingSessionError('Event must have a "type" string property', 400);
  }

  const session = await getSession(sessionId, supabase);
  if (!session) {
    throw new CookingSessionError('Cooking session not found', 404);
  }

  const result = transition(session, event);

  if ('error' in result) {
    throw new CookingSessionError(result.error, 400);
  }

  const { error } = await supabase
    .from('cooking_sessions')
    .update({
      current_step_index: result.currentStepIndex,
      step_completion: result.stepCompletion,
      status: result.status,
      updated_at: result.updatedAt,
    })
    .eq('id', sessionId);

  if (error) {
    throw new CookingSessionError(`Failed to update session: ${error.message}`, 500);
  }

  // Auto-log meal when session is finished
  if (result.status === 'completed' && result.recipeId) {
    try {
      await logMeal(userId, result.recipeId, sessionId, supabase);
    } catch (err) {
      console.error('[CookingSession] Failed to auto-log meal:', err);
    }
  }

  return result;
};

export { CookingSessionError };
