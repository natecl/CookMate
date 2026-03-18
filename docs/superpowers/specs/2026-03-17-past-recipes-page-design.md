# Past Recipes Page — Design Spec

## Summary

Add a "Past Recipes" page that appears after a user finishes cooking (with a congrats banner) and is also accessible from the MainPage via a button. Each past recipe links to the YourRecipePage where the user can view details and start cooking again.

## Requirements

1. After finishing cooking, the user sees a congrats message with the recipe name, followed by a list of all their past recipes.
2. Each recipe in the list has a "View Recipe" button that navigates to YourRecipePage with the full recipe object (which already has "Start Cooking").
3. A "Back to Home" button at the bottom navigates to MainPage (`/`).
4. The MainPage gets a "View Past Recipes" button that navigates to the same page (without the congrats banner).

## Approach

New standalone page at route `/past-recipes`. No backend changes — reuses existing `GET /api/recipes` endpoint which returns recipes ordered by `created_at` descending (newest first).

## New File

### `client/pages/PastRecipesPage.tsx`

- **Route state input:** `{ justFinished?: boolean, recipeName?: string }`
- **Dependencies:** Imports `useAuth` from `../context/AuthContext` for auth token. Constructs `API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL` (same pattern as RecipeLibraryPage).
- **TypeScript interface:** Defines a local `SavedRecipe` interface matching RecipeLibraryPage's pattern: `{ id: string, recipe_name: string, ingredients: string[], instructions: string[], created_at: string }`. Duplicates the type locally to match existing codebase convention.
- **Data fetching:** Calls `GET /api/recipes` with `Authorization: Bearer <token>` header via `useAuth()` session.
- **Congrats banner:** Shown only when `justFinished` is true. Displays recipe name. Uses `window.history.replaceState` after initial render to clear the state so the banner doesn't reappear on browser back-navigation.
- **Recipe list:** Each item shows recipe name, `ingredients.length` for ingredient count, and creation date. "View Recipe" button navigates to `/your-recipe` with the full `SavedRecipe` object in state (includes `recipe_name`, `ingredients`, `instructions` — all fields YourRecipePage needs).
- **Back to Home:** Uses `<Link to="/" className="back-link">` component (matching existing codebase pattern in RecipeLibraryPage and YourRecipePage).
- **Empty state:** "No past recipes yet." message when list is empty.
- **Loading/error states:** Uses existing `LoadingIndicator` and `ErrorMessage` components.
- **Styling:** Uses existing CSS classes (`container`, `recipe-content`, `recipe-card`, `submit-button`, `back-link`).

## Changes to Existing Files

### `client/pages/CookingPage.tsx`

Change `handleFinish` navigation target:
- **Before:** `navigate('/your-recipe', { state: { recipe: activeRecipe } })`
- **After:** `navigate('/past-recipes', { state: { justFinished: true, recipeName: activeRecipe.recipe_name } })`

### `client/pages/App.tsx`

Add import and route:
- **Import:** `import PastRecipesPage from './PastRecipesPage';`
- **Route:** `<Route path="/past-recipes" element={<ProtectedRoute><PastRecipesPage /></ProtectedRoute>} />`

### `client/pages/MainPage.tsx`

Add a `<Link to="/past-recipes" className="back-link">View Past Recipes</Link>` after the closing `</form>` tag and before the closing `</main>` tag. No route state passed (no congrats banner).

## Data Flow

```
CookingPage (Finish Cooking)
  → navigate('/past-recipes', { state: { justFinished: true, recipeName: '...' } })
    → PastRecipesPage shows congrats + recipe list

MainPage (View Past Recipes link)
  → <Link to="/past-recipes">
    → PastRecipesPage shows recipe list only (no congrats)

PastRecipesPage (View Recipe button)
  → navigate('/your-recipe', { state: { recipe: fullRecipeObject } })
    → YourRecipePage with "Start Cooking" button

PastRecipesPage (Back to Home link)
  → <Link to="/">
    → MainPage
```

## Out of Scope

- No delete functionality on this page (that stays in RecipeLibraryPage)
- No new backend endpoints
- No changes to recipe data model
- No shared type extraction (follow existing duplication pattern)
