# TypeScript Migration + AGENTS.md Rewrite — Design Spec

## Overview

Full rewrite of CookMate from JavaScript to TypeScript. Shared type definitions for WebSocket protocols and API contracts. Compact AGENTS.md rewrite (200-250 lines). Audio worklet files remain as JS.

## Goals

- Convert all `.js`/`.jsx` to `.ts`/`.tsx` (except `client/public/audio/*.js`)
- Define shared types at `types/` root level for cross-boundary contracts
- Maintain identical feature behavior — zero functional changes
- Rewrite AGENTS.md to be compact and optimal for AI agents (~200-250 lines)
- Use parallel sub-agents for speed

## Project Structure After Migration

```
cookmate/
├── types/                          # Shared type definitions
│   ├── websocket.ts                # All WS message types (cooking-live + scan)
│   ├── recipe.ts                   # Recipe, Ingredient types
│   ├── session.ts                  # CookingSession, SessionEvent, SessionStatus
│   ├── illustration.ts             # Illustration types
│   ├── api.ts                      # API request/response types
│   └── errors.ts                   # Custom error class types
│
├── client/
│   ├── components/
│   │   ├── ErrorMessage.tsx
│   │   ├── IngredientScanPanel.tsx
│   │   ├── LoadingIndicator.tsx
│   │   └── ModeSelector.tsx
│   ├── hooks/
│   │   ├── useCookingCamera.ts
│   │   ├── useCookingSession.ts
│   │   ├── useLiveIngredientScan.ts
│   │   ├── useRamseyBot.ts
│   │   └── useRecipeRequest.ts
│   ├── pages/
│   │   ├── App.tsx
│   │   ├── CookingPage.tsx
│   │   ├── MainPage.tsx
│   │   ├── YourRecipePage.tsx
│   │   └── index.tsx
│   ├── public/audio/*.js           # UNCHANGED (AudioWorklet — not bundled)
│   ├── styles/main.css             # UNCHANGED
│   ├── vite.config.ts
│   ├── tsconfig.json               # NEW
│   └── package.json
│
├── server/
│   ├── controllers/
│   │   ├── cookingController.ts
│   │   ├── healthController.ts
│   │   └── visionController.ts
│   ├── routes/
│   │   ├── cookingRoutes.ts
│   │   └── healthRoutes.ts
│   ├── services/
│   │   ├── agent/
│   │   │   ├── nanabotService.ts
│   │   │   └── ramseyBotService.ts
│   │   ├── vision/
│   │   │   ├── illustrationService.ts
│   │   │   └── ingredientVisionService.ts
│   │   ├── cookingSessionService.ts
│   │   └── recipeService.ts
│   ├── utils/
│   │   └── ingredientNormalization.ts
│   ├── ws/
│   │   ├── cookingLiveServer.ts
│   │   └── scanServer.ts
│   ├── index.ts
│   ├── tsconfig.json               # NEW
│   └── package.json
│
├── AGENTS.md                       # REWRITTEN (~200-250 lines)
└── package.json
```

## Shared Types

### types/recipe.ts
```typescript
export interface Recipe {
  recipe_name: string;
  ingredients: string[];
  instructions: string[];
}
```

### types/session.ts
```typescript
import type { Recipe } from './recipe';

export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

export type SessionEventType =
  | 'START_COOKING' | 'NEXT_STEP' | 'PREVIOUS_STEP'
  | 'MARK_STEP_COMPLETE' | 'GO_TO_STEP' | 'PAUSE_SESSION'
  | 'RESUME_SESSION' | 'FINISH_SESSION' | 'RESET_SESSION';

export interface SessionEvent {
  type: SessionEventType;
  stepIndex?: number;
}

export interface CookingSession {
  sessionId: string;
  recipe: Recipe;
  currentStepIndex: number;
  stepCompletion: boolean[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}
```

### types/websocket.ts
Discriminated unions for type-safe message handling:

```typescript
// Cooking Live protocol
export type CookingLiveClientMessage =
  | { type: 'live:start'; cookingSessionId: string }
  | { type: 'live:video'; image: string }
  | { type: 'live:stop' };

export type CookingLiveServerMessage =
  | { type: 'live:ready' }
  | { type: 'live:transcript'; role: 'user' | 'model'; text: string }
  | { type: 'live:turn_complete' }
  | { type: 'live:illustration_loading'; context: 'step' | 'clarify' }
  | { type: 'live:illustration'; context: 'step' | 'clarify'; image: string; format: 'png' | 'gif'; alt: string }
  | { type: 'live:illustration_error'; context: 'step' | 'clarify'; error: string }
  | { type: 'live:error'; error: string };

// Scan protocol
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

// Gemini Live session types (used internally by server)
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

// Active session map entry (cookingLiveServer internal)
export interface ActiveCookingSession {
  geminiSession: unknown; // Gemini SDK session type
  clientSocket: import('ws').WebSocket;
  currentStepIndex: number;
  recipe: import('./recipe').Recipe;
}
```

### types/api.ts
```typescript
// Matches actual API behavior — controllers return raw objects, not wrapped envelopes
export interface RecipeRequestBody {
  mode: 'suggestion' | 'import' | 'ingredients';
  data: {
    suggestion?: string;    // mode: 'suggestion'
    link?: string;          // mode: 'import'
    ingredients?: string[] | string;  // mode: 'ingredients' (CSV string or array)
  };
}

// Error response shape used by controllers
export interface ApiErrorResponse {
  error: string;
}
```

### types/illustration.ts
```typescript
export interface IllustrationResult {
  data: string; // base64
  format: 'png' | 'gif';
}
```

### types/errors.ts
```typescript
export class CookingSessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'CookingSessionError';
    this.status = status;
  }
}

export class RecipeRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RecipeRequestError';
    this.status = status;
  }
}
```

## Build Tooling

### Client
- Add devDeps: `typescript`, `@types/react`, `@types/react-dom`
- Add `tsconfig.json`
- Vite handles TSX natively — rename `vite.config.js` → `vite.config.ts`
- Use relative imports to `../../types/` (no path aliases — simpler, no extra config)

### Server
- Add devDeps: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/ws`, `@types/cors`
- Add `tsconfig.json`
- Dev script: `node index.js` → `tsx index.ts`
- Update `main` field in package.json
- Use relative imports to `../types/` (no path aliases)
- For packages without built-in types (`gif-encoder-2`, `pngjs`): add `declare module` in a `server/vendor.d.ts` file
- Check `@google/genai` and `@google/adk` for built-in types (both ship with TS types)

### Root
- Update dev scripts to reference new entry points

## Execution Plan (Sub-Agents)

### Phase 1: Setup (Sequential — main agent)
- Create `types/` directory with all shared type files
- Create `tsconfig.json` for client and server
- Install TypeScript dependencies via package.json edits
- Create `server/vendor.d.ts` for untyped packages

### Phase 2: Parallel Migration (3 sub-agents in worktrees)

**Agent A — Server Migration:**
Files: `server/index.js`, `server/controllers/{cooking,health,vision}Controller.js`, `server/routes/{cooking,health}Routes.js`, `server/services/agent/{nanabot,ramseyBot}Service.js`, `server/services/vision/{illustration,ingredientVision}Service.js`, `server/services/{cookingSession,recipe}Service.js`, `server/utils/ingredientNormalization.js`, `server/ws/{cookingLive,scan}Server.js`
Task: Convert each file to `.ts`, apply shared types from `types/`, use relative imports, delete `.js` originals.

**Agent B — Client Migration:**
Files: `client/pages/{App,CookingPage,MainPage,YourRecipePage,index}.jsx`, `client/components/{ErrorMessage,IngredientScanPanel,LoadingIndicator,ModeSelector}.jsx`, `client/hooks/{useCookingCamera,useCookingSession,useLiveIngredientScan,useRamseyBot,useRecipeRequest}.js`, `client/vite.config.js`
Task: Convert each file to `.tsx`/`.ts`, apply shared types from `types/`, use relative imports, delete `.js`/`.jsx` originals.

**Agent C — AGENTS.md Rewrite:**
Task: Rewrite AGENTS.md to 200-250 lines. Remove RL/agent memory, database/migration sections. Condense remaining rules. Update tech stack to TypeScript.

### Phase 3: Integration Fix-up (Sequential — main agent)
- Resolve any cross-reference or import path issues from parallel work
- Run `npm install` in both client and server
- Verify no `.js` files remain (except audio worklets)

### Phase 4: Integration Review (Sub-agent)
**Agent D — Integration Reviewer:**
Focuses on client-server contract correctness:
- HTTP endpoints: client fetch URLs match server route definitions
- WebSocket protocols: client message sends match server message handlers
- Shared types: both sides import and use the same type definitions consistently
- API response shapes: client parsing matches server response format
- Environment config: ports, URLs, CORS origins all consistent
- Import paths: all relative imports resolve correctly

## AGENTS.md Rewrite Strategy

Current: 791 lines with redundancy and speculative sections.
Target: 200-250 lines.

### Remove (not applicable to actual codebase):
- RL/agent memory rules (not implemented)
- Database/migration rules (no DB exists)
- Duplicate security rules across sections

### Keep & condense:
- Architecture boundaries (client/server/services)
- Non-negotiable rules (secrets, layer separation, error handling)
- API conventions (response shapes, health endpoint)
- Code style & naming
- Service layer rules (agent/, vision/)
- Update tech stack to TypeScript
- Operational notes

## Constraints

- Zero functional changes — all features must work identically
- Audio worklet files stay as vanilla JS in `client/public/audio/`
- No new dependencies beyond TypeScript tooling
- Preserve all existing environment variables
- CSS unchanged
- Work done on current branch — git commit at the end
