import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as recipesApi from "@/api/recipes";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recipeKeys } from "@/hooks/recipes/keys";
import { useRecipes } from "@/hooks/useRecipes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { MEAL_TYPES, type MealType } from "@/types/enums";
import type { RecipeListItem } from "@/types/recipe";
import { cn } from "@/lib/utils";

function recipeListItemNeedsMacrosFetch(r: RecipeListItem): boolean {
  if (r.macros === undefined) return true;
  const { kcal, protein, carbs, fat } = r.macros;
  return kcal === 0 && protein === 0 && carbs === 0 && fat === 0;
}

const FILTER_TABS: { id: MealType | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  ...MEAL_TYPES.map((m) => ({
    id: m,
    label:
      m === "BREAKFAST"
        ? "Breakfast"
        : m === "LUNCH"
          ? "Lunch"
          : m === "DINNER"
            ? "Dinner"
            : "Snack",
  })),
];

export default function RecipeLibrary() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [mealFilter, setMealFilter] = useState<MealType | "ALL">("ALL");

  const { data, isLoading, isError, error } = useRecipes();

  const idsForMacros = useMemo(
    () => data?.filter(recipeListItemNeedsMacrosFetch).map((r) => r.id) ?? [],
    [data],
  );

  const macrosQueries = useQueries({
    queries: idsForMacros.map((id) => ({
      queryKey: recipeKeys.macros(id),
      queryFn: () => recipesApi.fetchRecipeMacros(id),
    })),
  });

  const dataWithMacros = useMemo(() => {
    if (!data) return undefined;
    return data.map((r) => {
      if (!recipeListItemNeedsMacrosFetch(r)) return r;
      const idx = idsForMacros.indexOf(r.id);
      if (idx === -1) return r;
      const m = macrosQueries[idx]?.data;
      return m ? { ...r, macros: m } : r;
    });
  }, [data, idsForMacros, macrosQueries]);

  const filtered = useMemo(() => {
    let rows = dataWithMacros ?? [];
    if (mealFilter !== "ALL") {
      rows = rows.filter((r) => r.mealType === mealFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }, [data, mealFilter, debouncedSearch]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-text-primary">Recipes</h1>
        <Link to="/recipes/new" className={buttonVariants()}>
          + New Recipe
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          aria-label="Search recipes"
        />
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by meal type"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mealFilter === tab.id}
              onClick={() => setMealFilter(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                mealFilter === tab.id
                  ? "border-accent bg-accent-light text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-accent/40",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="text-text-secondary" role="status">
          Loading recipes…
        </p>
      )}
      {isError && (
        <p className="text-destructive" role="alert">
          {(error as Error)?.message ?? "Could not load recipes"}
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
          <p className="text-text-secondary">
            No recipes match your filters yet.
          </p>
          <Link
            to="/recipes/new"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
          >
            + Create your first recipe
          </Link>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="block">
              <RecipeCard recipe={recipe} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
