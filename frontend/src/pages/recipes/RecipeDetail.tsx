import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MacroBar } from "@/components/shared/MacroBar";
import { MacroChips } from "@/components/shared/MacroChips";
import { MealTypeChip } from "@/components/shared/MealTypeChip";
import { Dialog } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { useRecipe, useRecipeMacros } from "@/hooks/useRecipes";
import { DEMO_DAILY_TARGETS } from "@/lib/demo-targets";
import {
  formatMacroValue,
  ingredientMacros,
  sanitizeMacros,
  sumMacros,
} from "@/lib/macros";
import type { Macros } from "@/types/recipe";
import { recipeImageUrl } from "@/lib/recipe-image";
import type { QuantityUnit } from "@/types/enums";
import { cn } from "@/lib/utils";

function macrosHasAnyEnergy(m: Macros): boolean {
  return m.kcal > 0 || m.protein > 0 || m.carbs > 0 || m.fat > 0;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const recipeId = Number(id);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const { data: recipe, isLoading, isError, error } = useRecipe(
    Number.isFinite(recipeId) ? recipeId : undefined,
  );
  const { data: macros } = useRecipeMacros(
    Number.isFinite(recipeId) ? recipeId : undefined,
  );

  const tableTotals = useMemo(() => {
    if (!recipe?.recipeIngredients?.length) {
      return sanitizeMacros({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    }
    return sanitizeMacros(
      sumMacros(
        recipe.recipeIngredients.map((ri) => {
          const ing = ri.ingredient;
          if (!ing) {
            return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
          }
          return ingredientMacros(ing, ri.quantity, ri.unit as QuantityUnit);
        }),
      ),
    );
  }, [recipe]);

  const displayMacros = useMemo(() => {
    const api = macros != null ? sanitizeMacros(macros) : undefined;
    const apiOk = api != null && macrosHasAnyEnergy(api);
    const tableOk = macrosHasAnyEnergy(tableTotals);
    if (apiOk) return api;
    if (tableOk) return tableTotals;
    return api ?? tableTotals;
  }, [macros, tableTotals]);

  if (!Number.isFinite(recipeId)) {
    return <p className="text-text-secondary">Invalid recipe.</p>;
  }

  if (isLoading) {
    return (
      <p className="text-text-secondary" role="status">
        Loading recipe…
      </p>
    );
  }

  if (isError || !recipe) {
    return (
      <p className="text-destructive" role="alert">
        {(error as Error)?.message ?? "Recipe not found."}
      </p>
    );
  }

  const recipeImgSrc = recipeImageUrl(recipe);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-text-primary">{recipe.name}</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/recipes/${recipe.id}/edit`}
            className={buttonVariants({ variant: "default" })}
          >
            Edit recipe
          </Link>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            onClick={() => setPlannerOpen(true)}
          >
            Add to Planner
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <div className="aspect-[4/3] w-full bg-surface-muted">
              {recipeImgSrc ? (
                <img
                  src={recipeImgSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MealTypeChip mealType={recipe.mealType} />
            {recipe.prepTimeMin != null && (
              <span className="text-sm text-text-secondary">
                Prep: {recipe.prepTimeMin} min
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="text-text-secondary">{recipe.description}</p>
          )}
          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Totals (recipe)
            </p>
            <MacroChips macros={displayMacros} size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Compared to example daily targets
            </p>
            <MacroBar actual={displayMacros} target={DEMO_DAILY_TARGETS} />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <h2 className="font-display text-xl text-text-primary">Ingredients</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2 font-medium">Ingredient</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Kcal</th>
                  <th className="px-3 py-2 font-medium">P</th>
                  <th className="px-3 py-2 font-medium">C</th>
                  <th className="px-3 py-2 font-medium">F</th>
                </tr>
              </thead>
              <tbody>
                {recipe.recipeIngredients.map((ri) => {
                  const ing = ri.ingredient;
                  const m = ing
                    ? sanitizeMacros(
                        ingredientMacros(
                          ing,
                          ri.quantity,
                          ri.unit as QuantityUnit,
                        ),
                      )
                    : sanitizeMacros({
                        kcal: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                      });
                  return (
                    <tr
                      key={ri.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {ri.ingredient?.name?.trim() ||
                          ri.ingredientName?.trim() ||
                          `Ingredient #${ri.ingredientId}`}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-text-secondary">
                        {ri.quantity}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {ri.unit === "GRAMS" ? "g" : "pcs"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMacroValue(m.kcal, "kcal")}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-macro-protein">
                        {formatMacroValue(m.protein, "g")}g
                      </td>
                      <td className="px-3 py-2 tabular-nums text-macro-carbs">
                        {formatMacroValue(m.carbs, "g")}g
                      </td>
                      <td className="px-3 py-2 tabular-nums text-macro-fat">
                        {formatMacroValue(m.fat, "g")}g
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-muted font-semibold text-text-primary">
                  <td className="px-3 py-3" colSpan={3}>
                    Totals
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatMacroValue(tableTotals.kcal, "kcal")}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatMacroValue(tableTotals.protein, "g")}g
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatMacroValue(tableTotals.carbs, "g")}g
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatMacroValue(tableTotals.fat, "g")}g
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        title="Add to meal plan"
      >
        <p className="text-sm text-text-secondary">
          Open the meal planner to drag this recipe into a day and meal slot.
        </p>
        <Link
          to="/planner"
          className={cn(buttonVariants(), "mt-4 inline-flex")}
          onClick={() => setPlannerOpen(false)}
        >
          Open planner
        </Link>
      </Dialog>
    </div>
  );
}
