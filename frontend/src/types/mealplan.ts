import type { MealType } from "@/types/enums";
import type { Macros, RecipeListItem } from "@/types/recipe";

export type MealPlan = {
  id: number;
  name: string;
  daysCount: number;
  startDate: string;
  userProfileIds: number[];
  createdAt: string;
  updatedAt?: string;
};

export type MealPlanEntry = {
  id: number;
  mealPlanDayId: number;
  userProfileId: number;
  recipeId: number;
  mealType: MealType;
  scalingFactor: number;
  calculatedKcal: number;
  calculatedProtein: number;
  calculatedCarbs: number;
  calculatedFat: number;
  recipe?: RecipeListItem & { imageUrl?: string };
};

export type MealPlanDay = {
  id: number;
  mealPlanId: number;
  dayNumber: number;
  entries: MealPlanEntry[];
};

export type MealPlanDetail = MealPlan & {
  days: MealPlanDay[];
};

export type CreateMealPlanPayload = {
  name: string;
  daysCount: number;
  startDate: string;
  userProfileIds: number[];
};

export type UpdateMealPlanPayload = Partial<
  Pick<CreateMealPlanPayload, "name" | "daysCount" | "startDate" | "userProfileIds">
>;

export type AssignRecipePayload = {
  recipeId: number;
  mealType: MealType;
  userProfileId: number;
};

export type UpdateMealPlanEntryPayload = {
  recipeId?: number;
  mealType?: MealType;
  userProfileId?: number;
  /** If supported, move entry to another day (otherwise use delete + assign). */
  dayNumber?: number;
};

/** Per-day macro totals vs targets (normalized client-side if API differs). */
export type MealPlanSummary = {
  mealPlanId: number;
  days: Array<{
    dayNumber: number;
    byProfile: Record<
      number,
      {
        totals: Macros;
        targets: Macros;
      }
    >;
  }>;
};
