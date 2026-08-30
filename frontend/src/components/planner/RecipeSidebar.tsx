import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MealTypeChip } from "@/components/shared/MealTypeChip";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { recipeImageUrl } from "@/lib/recipe-image";
import { MEAL_TYPES, type MealType } from "@/types/enums";
import type { RecipeListItem } from "@/types/recipe";
import { cn } from "@/lib/utils";

type RecipeSidebarProps = {
  recipes: RecipeListItem[];
  className?: string;
};

function DraggableRecipe({ recipe }: { recipe: RecipeListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `recipe:${recipe.id}`,
      data: {
        type: "recipe" as const,
        recipeId: recipe.id,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const macros = recipe.macros ?? {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const imgSrc = recipeImageUrl(recipe);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab gap-3 rounded-lg border border-border bg-surface p-2 shadow-card active:cursor-grabbing",
        isDragging && "opacity-60",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-surface-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <MealTypeChip mealType={recipe.mealType} />
        <p className="mt-1 truncate font-medium text-text-primary">
          {recipe.name}
        </p>
        <p className="text-xs text-text-muted">
          {Math.round(macros.kcal)} kcal
        </p>
      </div>
    </div>
  );
}

export function RecipeSidebar({ recipes, className }: RecipeSidebarProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [mealFilter, setMealFilter] = useState<MealType | "ALL">("ALL");

  const filtered = useMemo(() => {
    let rows = recipes;
    if (mealFilter !== "ALL") {
      rows = rows.filter((r) => r.mealType === mealFilter);
    }
    if (debounced.trim()) {
      const q = debounced.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }, [recipes, mealFilter, debounced]);

  return (
    <aside
      className={cn(
        "flex w-[280px] shrink-0 flex-col border-l border-border bg-surface pl-4",
        className,
      )}
    >
      <h2 className="mb-3 font-display text-lg text-text-primary">Recipes</h2>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="pl-9"
          aria-label="Search recipes"
        />
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setMealFilter("ALL")}
          className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            mealFilter === "ALL"
              ? "bg-accent-light text-accent"
              : "bg-surface-muted text-text-secondary",
          )}
        >
          All
        </button>
        {MEAL_TYPES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMealFilter(m)}
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              mealFilter === m
                ? "bg-accent-light text-accent"
                : "bg-surface-muted text-text-secondary",
            )}
          >
            {m[0] + m.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {filtered.map((r) => (
          <DraggableRecipe key={r.id} recipe={r} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-text-muted">No recipes match filters.</p>
        )}
      </div>
    </aside>
  );
}
