import type { Recipe } from './recipe';
import type WebSocket from 'ws';

// --- Cooking Live protocol ---

export type CookingLiveClientMessage =
  | { type: 'live:start'; cookingSessionId: string }
  | { type: 'live:video'; image: string }
  | { type: 'live:step_changed'; stepIndex: number }
  | { type: 'live:stop' };

export type CookingLiveServerMessage =
  | { type: 'live:ready' }
  | { type: 'live:transcript'; role: 'user' | 'model'; text: string }
  | { type: 'live:turn_complete' }
  | { type: 'live:interrupted' }
  | { type: 'live:error'; error: string };

// --- Scan protocol ---

export type ScanClientMessage =
  | { type: 'scan:start'; sessionId: string }
  | { type: 'scan:frame'; sessionId: string; image: string }
  | { type: 'scan:stop'; sessionId: string }
  | { type: 'scan:finalize'; sessionId: string; ingredients: string[] };

export type ScanServerMessage =
  | { type: 'scan:started'; sessionId: string }
  | { type: 'scan:update'; sessionId: string; ingredients: DetectedIngredient[] }
  | { type: 'scan:stopped'; sessionId: string; ingredients: DetectedIngredient[] }
  | { type: 'scan:finalized'; sessionId: string; ingredients: string[] }
  | { type: 'scan:error'; sessionId?: string; error: string };

export interface DetectedIngredient {
  name: string;
  confidence: number;
}

// --- Gemini Live session types (server internal) ---

export interface LiveSessionCallbacks {
  onReady: () => void;
  onMessage: (message: GeminiLiveMessage) => void;
  onError: (error: Error) => void;
  onClose: (event?: unknown) => void;
}

export interface GeminiLiveMessage {
  serverContent?: {
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
    modelTurn?: { parts: Array<{ inlineData?: { data: string } }> };
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{
      id: string;
      name: string;
      args?: Record<string, unknown>;
    }>;
  };
}

export interface ActiveCookingSession {
  geminiSession: unknown;
  clientSocket: WebSocket;
  currentStepIndex: number;
  recipe: Recipe;
}
