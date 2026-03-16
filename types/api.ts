export interface RecipeRequestBody {
  mode: 'suggestion' | 'import' | 'ingredients';
  data: {
    suggestion?: string;
    link?: string;
    ingredients?: string[] | string;
  };
}

export interface ApiErrorResponse {
  error: string;
}
