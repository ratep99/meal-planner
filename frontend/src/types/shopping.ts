import type { IngredientCategory } from "@/types/enums";

export type ShoppingListSummary = {
  id: number;
  name: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  mealPlanIds: number[];
  totalItems: number;
};

export type ShoppingListItem = {
  id: number;
  shoppingListId: number;
  ingredientId: number;
  ingredientName: string;
  /** mealPlanId → quantity for that plan */
  quantityPerMealPlan: Record<number, number>;
  totalQuantity: number;
  displayUnit: string;
  category: IngredientCategory;
};

export type ShoppingListDetail = ShoppingListSummary & {
  items: ShoppingListItem[];
};

export type ShoppingCategoryGroup = {
  category: IngredientCategory;
  items: ShoppingListItem[];
};

export type GenerateShoppingPayload = {
  mealPlanIds: number[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  name?: string;
};
