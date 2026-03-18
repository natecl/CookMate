# Past Recipes Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Past Recipes page that shows a congrats banner after cooking and lists all past recipes with navigation to view/re-cook them.

**Architecture:** New `PastRecipesPage` component at `/past-recipes` route. Reuses existing `GET /api/recipes` endpoint. Two entry points: post-cooking completion flow (with congrats) and MainPage button (without congrats). Follows existing page patterns from RecipeLibraryPage.

**Tech Stack:** React, TypeScript, React Router (useNavigate, useLocation, Link)

**Spec:** `docs/superpowers/specs/2026-03-17-past-recipes-page-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `client/pages/PastRecipesPage.tsx` | Create | New page: congrats banner + recipe list + navigation |
| `client/pages/App.tsx` | Modify | Add route and import for PastRecipesPage |
| `client/pages/CookingPage.tsx` | Modify | Change finish navigation to `/past-recipes` |
| `client/pages/MainPage.tsx` | Modify | Add "View Past Recipes" link |

---

### Task 1: Create PastRecipesPage component

**Files:**
- Create: `client/pages/PastRecipesPage.tsx`

- [ ] **Step 1: Create the PastRecipesPage component**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5000';

interface SavedRecipe {
  id: string;
  recipe_name: string;
  ingredients: string[];
  instructions: string[];
  created_at: string;
}

const PastRecipesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const locationState = location.state as { justFinished?: boolean; recipeName?: string } | null;
  const justFinished = locationState?.justFinished ?? false;
  const recipeName = locationState?.recipeName ?? '';

  const clearedRef = useRef(false);
  useEffect(() => {
    if (justFinished && !clearedRef.current) {
      clearedRef.current = true;
      window.history.replaceState({}, '');
    }
  }, [justFinished]);

  const fetchRecipes = useCallback(async () => {
    if (!session?.access_token) {
      setErrorMessage('You must be logged in to view recipes.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipes (${response.status}).`);
      }

      const data: SavedRecipe[] = await response.json();
      setRecipes(data);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleRecipeClick = (recipe: SavedRecipe) => {
    navigate('/your-recipe', { state: { recipe } });
  };

  return (
    <main className="container">
      {justFinished && (
        <section style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1>Great job!</h1>
          <p>You finished cooking <strong>{recipeName}</strong></p>
        </section>
      )}

      <h2>Past Recipes</h2>

      {isLoading && <LoadingIndicator />}

      {errorMessage && <ErrorMessage message={errorMessage} />}

      {!isLoading && !errorMessage && recipes.length === 0 && (
        <p>No past recipes yet.</p>
      )}

      {!isLoading && recipes.length > 0 && (
        <section className="recipe-content">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleRecipeClick(recipe)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleRecipeClick(recipe);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <p>
                  <strong>{recipe.recipe_name}</strong>
                </p>
                <p>
                  {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                </p>
                <p>
                  {new Date(recipe.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                className="submit-button"
                onClick={() => handleRecipeClick(recipe)}
              >
                View Recipe
              </button>
            </div>
          ))}
        </section>
      )}

      <Link to="/" className="back-link">
        Back to Home
      </Link>
    </main>
  );
};

export default PastRecipesPage;
```

- [ ] **Step 2: Verify the file was created**

Run: `ls client/pages/PastRecipesPage.tsx`
Expected: file exists

---

### Task 2: Add route in App.tsx

**Files:**
- Modify: `client/pages/App.tsx:1-23`

- [ ] **Step 1: Add import for PastRecipesPage**

In `client/pages/App.tsx`, add after the existing page imports (after line 8):

```tsx
import PastRecipesPage from './PastRecipesPage';
```

- [ ] **Step 2: Add the route**

In `client/pages/App.tsx`, add a new route after the `/recipes` route (after line 17):

```tsx
    <Route path="/past-recipes" element={<ProtectedRoute><PastRecipesPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Verify app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add client/pages/PastRecipesPage.tsx client/pages/App.tsx
git commit -m "feat: add PastRecipesPage with route"
```

---

### Task 3: Update CookingPage finish navigation

**Files:**
- Modify: `client/pages/CookingPage.tsx:198`

- [ ] **Step 1: Change handleFinish navigation**

In `client/pages/CookingPage.tsx`, in the `handleFinish` function, change:

```tsx
    navigate('/your-recipe', { state: { recipe: activeRecipe } });
```

to:

```tsx
    navigate('/past-recipes', { state: { justFinished: true, recipeName: activeRecipe.recipe_name } });
```

- [ ] **Step 2: Verify app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add client/pages/CookingPage.tsx
git commit -m "feat: navigate to past-recipes after finishing cooking"
```

---

### Task 4: Add "View Past Recipes" link on MainPage

**Files:**
- Modify: `client/pages/MainPage.tsx:133-197`

- [ ] **Step 1: Add Link import**

In `client/pages/MainPage.tsx`, add `Link` to the react-router-dom import:

```tsx
import { useNavigate, Link } from 'react-router-dom';
```

- [ ] **Step 2: Add the link after the form**

In `client/pages/MainPage.tsx`, add after the closing `</form>` tag (after line 194) and before `</main>`:

```tsx
      <Link to="/past-recipes" className="back-link">
        View Past Recipes
      </Link>
```

- [ ] **Step 3: Verify app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add client/pages/MainPage.tsx
git commit -m "feat: add View Past Recipes link to MainPage"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start the dev server**

Run: `cd client && npm run dev`

- [ ] **Step 2: Test MainPage link**

Navigate to `http://localhost:5173`. Verify "View Past Recipes" link appears below the form. Click it — should navigate to `/past-recipes` showing the recipe list without a congrats banner. "Back to Home" link should return to `/`.

- [ ] **Step 3: Test recipe click**

On the Past Recipes page, click a recipe or its "View Recipe" button. Should navigate to YourRecipePage showing recipe details with a "Start Cooking" button.

- [ ] **Step 4: Test completion flow**

Start and complete a full cooking session. After clicking "Finish Cooking", should navigate to `/past-recipes` with congrats banner showing the recipe name, followed by the recipe list.

- [ ] **Step 5: Test back-navigation**

After seeing the congrats banner, click browser back button. Navigate forward again — congrats banner should NOT reappear (state was cleared).
