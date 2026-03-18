import type { Recipe } from './recipe';

export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

export type SessionEventType =
  | 'START_COOKING'
  | 'NEXT_STEP'
  | 'PREVIOUS_STEP'
  | 'MARK_STEP_COMPLETE'
  | 'GO_TO_STEP'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'FINISH_SESSION'
  | 'RESET_SESSION';

export interface SessionEvent {
  type: SessionEventType;
  stepIndex?: number;
}

export interface CookingSession {
  sessionId: string;
  recipeId?: string;
  recipe: Recipe;
  currentStepIndex: number;
  stepCompletion: boolean[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}
