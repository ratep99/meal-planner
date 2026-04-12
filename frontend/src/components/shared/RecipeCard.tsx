import { MealTypeChip } from "@/components/shared/MealTypeChip";
import { MacroChips } from "@/components/shared/MacroChips";
import { recipeImageUrl } from "@/lib/recipe-image";
import type { RecipeListItem } from "@/types/recipe";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  recipe: RecipeListItem;
  onClick?: () => void;
  className?: string;
};

export function RecipeCard({ recipe, onClick, className }: RecipeCardProps) {
  const macros = recipe.macros ?? {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const imgSrc = recipeImageUrl(recipe);

  const inner = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <MealTypeChip mealType={recipe.mealType} />
        <h3 className="font-display text-[1.1rem] font-semibold leading-snug text-text-primary group-hover:text-accent">
          {recipe.name}
        </h3>
        <MacroChips macros={macros} size="sm" />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group w-full overflow-hidden rounded-lg border border-border bg-surface text-left shadow-card transition-transform duration-200",
          "hover:scale-[1.02] hover:shadow-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group w-full overflow-hidden rounded-lg border border-border bg-surface text-left shadow-card transition-transform duration-200",
        "hover:scale-[1.02] hover:shadow-hover",
        className,
      )}
    >
      {inner}
    </div>
  );
}
