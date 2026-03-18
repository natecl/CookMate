import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5000';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealLog {
  id: string;
  cooked_at: string;
  recipe_name?: string;
  nutrition?: NutritionData | null;
}

const MealLogPage = () => {
  const { session } = useAuth();
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchMealLogs = async () => {
      if (!session?.access_token) {
        setErrorMessage('You must be logged in to view meal logs.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/meal-logs`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch meal logs (${response.status}).`);
        }

        const data: MealLog[] = await response.json();
        setMealLogs(data);
      } catch (error) {
        setErrorMessage((error as Error).message || 'Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMealLogs();
  }, [session?.access_token]);

  return (
    <main className="container">
      <h1>Meal Log</h1>

      <Link to="/" className="back-link">
        Back to home
      </Link>

      {isLoading && <LoadingIndicator />}

      {errorMessage && <ErrorMessage message={errorMessage} />}

      {!isLoading && !errorMessage && mealLogs.length === 0 && (
        <p>No meal logs yet. Start cooking to log your meals.</p>
      )}

      {!isLoading && mealLogs.length > 0 && (
        <section className="recipe-content">
          {mealLogs.map((log) => (
            <div key={log.id} className="recipe-card">
              <p>
                <strong>{log.recipe_name || 'Unnamed Meal'}</strong>
              </p>
              <p>
                Cooked: {new Date(log.cooked_at).toLocaleDateString()}
              </p>
              {log.nutrition && (
                <div>
                  <p>
                    Calories: {log.nutrition.calories} kcal
                  </p>
                  <p>
                    Protein: {log.nutrition.protein}g
                  </p>
                  <p>
                    Carbs: {log.nutrition.carbs}g
                  </p>
                  <p>
                    Fats: {log.nutrition.fats}g
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
};

export default MealLogPage;
