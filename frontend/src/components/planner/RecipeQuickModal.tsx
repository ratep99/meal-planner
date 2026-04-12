import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { MacroChips } from "@/components/shared/MacroChips";
import { MealTypeChip } from "@/components/shared/MealTypeChip";
import { buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useRecipe, useRecipeMacros } from "@/hooks/useRecipes";
import { recipeImageUrl } from "@/lib/recipe-image";
import { cn } from "@/lib/utils";

type RecipeQuickModalProps = {
  recipeId: number | null;
  open: boolean;
  onClose: () => void;
};

export function RecipeQuickModal({
  recipeId,
  open,
  onClose,
}: RecipeQuickModalProps) {
  const { data: recipe, isLoading } = useRecipe(recipeId ?? undefined);
  const { data: macros } = useRecipeMacros(recipeId ?? undefined);

  const displayMacros =
    macros ??
    (recipe
      ? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const recipeImgSrc = recipe ? recipeImageUrl(recipe) : undefined;

  return (
    <Dialog open={open} onClose={onClose} title="Recipe">
      {recipeId == null ? null : isLoading ? (
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : recipe ? (
        <div className="space-y-4">
          <div className="aspect-video max-h-48 overflow-hidden rounded-lg bg-surface-muted">
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
          <div className="flex flex-wrap items-center gap-2">
            <MealTypeChip mealType={recipe.mealType} />
            {recipe.prepTimeMin != null && (
              <span className="text-sm text-text-secondary">
                Prep: {recipe.prepTimeMin} min
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl text-text-primary">
            {recipe.name}
          </h3>
          {recipe.description && (
            <p className="text-sm text-text-secondary">{recipe.description}</p>
          )}
          <MacroChips macros={displayMacros} size="sm" />
          <Link
            to={`/recipes/${recipe.id}`}
            className={cn(buttonVariants(), "inline-flex")}
            onClick={onClose}
          >
            View full recipe
          </Link>
        </div>
      ) : (
        <p className="text-destructive">Could not load recipe.</p>
      )}
    </Dialog>
  );
}
