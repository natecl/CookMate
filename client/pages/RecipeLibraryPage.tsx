import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const RecipeLibraryPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleDelete = async (id: string) => {
    if (!session?.access_token) {
      return;
    }

    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete recipe (${response.status}).`);
      }

      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to delete recipe.');
    }
  };

  const handleRecipeClick = (recipe: SavedRecipe) => {
    navigate('/your-recipe', { state: { recipe } });
  };

  return (
    <main className="container">
      <h1>Recipe Library</h1>

      <Link to="/" className="back-link">
        Back to home
      </Link>

      {isLoading && <LoadingIndicator />}

      {errorMessage && <ErrorMessage message={errorMessage} />}

      {!isLoading && !errorMessage && recipes.length === 0 && (
        <p>No saved recipes yet. Generate a recipe to get started.</p>
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
                  Created: {new Date(recipe.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                className="submit-button"
                onClick={() => handleDelete(recipe.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  );
};

export default RecipeLibraryPage;
