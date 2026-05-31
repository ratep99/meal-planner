import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/components/layout/ShellLayout";
import {
  DashboardPage,
  IngredientsPage,
  MealPlannerDetailPage,
  MealPlannerPage,
  ProfileEditPage,
  ProfileNewPage,
  ProfilesPage,
  RecipeDetailPage,
  RecipeEditPage,
  RecipeLibraryPage,
  RecipeNewPage,
  SettingsPage,
  ShoppingDetailPage,
  ShoppingListsPage,
} from "@/routes/lazy-pages";

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-text-secondary">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<ShellLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="recipes/new" element={<RecipeNewPage />} />
          <Route path="recipes/:id/edit" element={<RecipeEditPage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="recipes" element={<RecipeLibraryPage />} />
          <Route path="planner" element={<MealPlannerPage />} />
          <Route path="planner/:mealPlanId" element={<MealPlannerDetailPage />} />
          <Route path="shopping" element={<ShoppingListsPage />} />
          <Route path="shopping/:id" element={<ShoppingDetailPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="profiles/new" element={<ProfileNewPage />} />
          <Route path="profiles/:id/edit" element={<ProfileEditPage />} />
          <Route path="profiles" element={<ProfilesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
