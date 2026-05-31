import { lazy } from "react";

export const DashboardPage = lazy(() => import("@/pages/Dashboard"));
export const RecipeLibraryPage = lazy(() => import("@/pages/recipes/RecipeLibrary"));
export const RecipeNewPage = lazy(() => import("@/pages/recipes/RecipeNew"));
export const RecipeDetailPage = lazy(() => import("@/pages/recipes/RecipeDetail"));
export const RecipeEditPage = lazy(() => import("@/pages/recipes/RecipeEdit"));
export const MealPlannerPage = lazy(() => import("@/pages/planner/MealPlanner"));
export const MealPlannerDetailPage = lazy(
  () => import("@/pages/planner/MealPlannerDetail"),
);
export const ShoppingListsPage = lazy(
  () => import("@/pages/shopping/ShoppingLists"),
);
export const ShoppingDetailPage = lazy(
  () => import("@/pages/shopping/ShoppingDetail"),
);
export const IngredientsPage = lazy(() => import("@/pages/Ingredients"));
export const ProfilesPage = lazy(() => import("@/pages/profiles/Profiles"));
export const ProfileNewPage = lazy(() => import("@/pages/profiles/ProfileNew"));
export const ProfileEditPage = lazy(() => import("@/pages/profiles/ProfileEdit"));
export const SettingsPage = lazy(() => import("@/pages/Settings"));
