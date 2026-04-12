import type { MealType, QuantityUnit } from "@/types/enums";
import type { Ingredient } from "@/types/ingredient";

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Recipe = {
  id: number;
  name: string;
  mealType: MealType;
  description: string | null;
  prepTimeMin: number | null;
  /** Server-stored filename under /uploads/recipes/{imageFilename} */
  imageFilename?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Recipe with optional totals for list cards (when API returns them). */
export type RecipeListItem = Recipe & {
  macros?: Macros;
};

export type RecipeIngredient = {
  id: number;
  recipeId: number;
  ingredientId: number;
  quantity: number;
  unit: QuantityUnit;
  optional: boolean;
  ingredient?: Ingredient;
  /** When the API omits nested `ingredient` but includes a display name. */
  ingredientName?: string | null;
};

export type RecipeDetail = Recipe & {
  recipeIngredients: RecipeIngredient[];
};

export type CreateRecipeIngredientPayload = {
  ingredientId: number;
  quantity: number;
  unit: QuantityUnit;
  optional?: boolean;
};

export type CreateRecipePayload = {
  name: string;
  mealType: MealType;
  description?: string | null;
  prepTimeMin?: number | null;
};

export type UpdateRecipePayload = Partial<CreateRecipePayload>;

export type UpdateRecipeIngredientPayload = {
  quantity?: number;
  unit?: QuantityUnit;
  optional?: boolean;
};
