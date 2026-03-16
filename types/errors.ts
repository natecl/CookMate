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
