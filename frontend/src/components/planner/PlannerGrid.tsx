import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deriveDayTotals, slotId } from "@/lib/planner";
import { formatMacroValue } from "@/lib/macros";
import { addDays, getPlanDayNumber, WEEKDAY_LABELS_SHORT } from "@/lib/week-utils";
import { MEAL_TYPES, type MealType } from "@/types/enums";
import type { MealPlanDetail, MealPlanEntry } from "@/types/mealplan";
import type { RecipeListItem } from "@/types/recipe";
import { cn } from "@/lib/utils";

const MEAL_ROW_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const emptyCellClass =
  "flex min-h-[4.5rem] items-center justify-center rounded-md border-2 border-dashed border-border bg-surface-muted/30 px-2 py-2";

type PlannerGridProps = {
  plan: MealPlanDetail;
  /** Monday 00:00 local for the calendar week shown (Mon–Sun columns). */
  weekMonday: Date;
  highlightedPlanDay: number | null;
  profileIds: number[];
  /** Profiles included in per-column “Day total” row (matches planner profile mode). */
  totalsProfileIds: number[];
  profileNames: Record<number, string>;
  recipesById: Map<number, RecipeListItem>;
  dimProfileId: (profileId: number) => boolean;
  onRemoveEntry: (dayNumber: number, entryId: number) => void;
  onOpenRecipe: (recipeId: number) => void;
};

function findEntry(
  plan: MealPlanDetail,
  dayNumber: number,
  mealType: MealType,
  profileId: number,
): MealPlanEntry | undefined {
  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  return day?.entries.find(
    (e) => e.mealType === mealType && e.userProfileId === profileId,
  );
}

function entryDisplayTitle(
  entry: MealPlanEntry,
  recipesById: Map<number, RecipeListItem>,
): string {
  return (
    entry.recipe?.name?.trim() ||
    recipesById.get(entry.recipeId)?.name ||
    `Recipe #${entry.recipeId}`
  );
}

function DraggableEntryCard({
  entry,
  dayNumber,
  mealType,
  profileId,
  recipesById,
  dimmed,
  onRemove,
  onOpenRecipe,
}: {
  entry: MealPlanEntry;
  dayNumber: number;
  mealType: MealType;
  profileId: number;
  recipesById: Map<number, RecipeListItem>;
  dimmed: boolean;
  onRemove: () => void;
  onOpenRecipe: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `entry:${entry.id}`,
      data: {
        type: "entry" as const,
        entryId: entry.id,
        dayNumber,
        mealType,
        profileId,
        recipeId: entry.recipeId,
      },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const title = entryDisplayTitle(entry, recipesById);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-[4.5rem] items-stretch gap-1 rounded-md border border-border bg-surface-muted/50 px-2 py-2 transition-colors hover:border-accent hover:bg-accent-light/20",
        isDragging && "opacity-60",
        dimmed && "opacity-50",
      )}
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 touch-none text-text-muted hover:text-text-primary"
        aria-label="Drag"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onOpenRecipe}
      >
        <p className="text-sm font-medium leading-snug text-text-primary">
          {title}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {Math.round(entry.calculatedKcal)} kcal
        </p>
      </button>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-8 shrink-0 self-start p-0 text-destructive hover:text-destructive"
        aria-label="Remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PlannerSlot({
  plan,
  dayNumber,
  mealType,
  profileId,
  recipesById,
  dimmed,
  onRemoveEntry,
  onOpenRecipe,
}: {
  plan: MealPlanDetail;
  dayNumber: number;
  mealType: MealType;
  profileId: number;
  recipesById: Map<number, RecipeListItem>;
  dimmed: boolean;
  onRemoveEntry: (dayNumber: number, entryId: number) => void;
  onOpenRecipe: (recipeId: number) => void;
}) {
  const id = slotId(dayNumber, mealType, profileId);
  const entry = findEntry(plan, dayNumber, mealType, profileId);

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "slot" as const,
      dayNumber,
      mealType,
      profileId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        entry
          ? cn(
              "p-0",
              isOver &&
                "rounded-md ring-2 ring-accent ring-offset-1 ring-offset-background",
            )
          : cn(
              emptyCellClass,
              isOver && "border-accent bg-accent-light/30",
            ),
        dimmed && !entry && "opacity-50",
      )}
    >
      {entry ? (
        <DraggableEntryCard
          entry={entry}
          dayNumber={dayNumber}
          mealType={mealType}
          profileId={profileId}
          recipesById={recipesById}
          dimmed={dimmed}
          onRemove={() => onRemoveEntry(dayNumber, entry.id)}
          onOpenRecipe={() => onOpenRecipe(entry.recipeId)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5 text-center">
          <span className="text-xs font-medium text-text-muted">+ Add</span>
          <span className="text-[10px] text-text-muted">Drop recipe</span>
        </div>
      )}
    </div>
  );
}

function columnHasMeals(
  plan: MealPlanDetail,
  planDay: number | null,
  profileIds: number[],
): boolean {
  if (planDay == null || !profileIds.length) return false;
  const day = plan.days.find((d) => d.dayNumber === planDay);
  if (!day) return false;
  return day.entries.some((e) => profileIds.includes(e.userProfileId));
}

export function PlannerGrid({
  plan,
  weekMonday,
  highlightedPlanDay,
  profileIds,
  totalsProfileIds,
  profileNames,
  recipesById,
  dimProfileId,
  onRemoveEntry,
  onOpenRecipe,
}: PlannerGridProps) {
  const columnMeta = useMemo(() => {
    return Array.from({ length: 7 }, (_, colIdx) => {
      const cellDate = addDays(weekMonday, colIdx);
      const planDay = getPlanDayNumber(
        plan.startDate,
        plan.daysCount,
        cellDate,
      );
      const colHighlight =
        highlightedPlanDay != null &&
        planDay != null &&
        planDay === highlightedPlanDay;
      return { colIdx, planDay, colHighlight };
    });
  }, [plan.startDate, plan.daysCount, weekMonday, highlightedPlanDay]);

  const totalsIds =
    totalsProfileIds.length > 0 ? totalsProfileIds : profileIds;

  return (
    <div className="min-w-0 flex-1 overflow-x-auto pb-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th
                scope="col"
                className="sticky left-0 z-10 w-28 min-w-[7rem] bg-surface-muted px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
              >
                Meal
              </th>
              {columnMeta.map(({ colIdx, colHighlight }) => (
                <th
                  key={colIdx}
                  scope="col"
                  className={cn(
                    "px-2 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted",
                    colHighlight && "bg-accent-light/25",
                  )}
                >
                  {WEEKDAY_LABELS_SHORT[colIdx]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map((mt) => (
              <tr key={mt} className="border-b border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-background px-3 py-3 text-left font-medium text-text-primary"
                >
                  {MEAL_ROW_LABEL[mt]}
                </th>
                {columnMeta.map(({ colIdx, planDay, colHighlight }) => (
                  <td
                    key={`${mt}-${colIdx}`}
                    className={cn(
                      "align-top px-2 py-3",
                      colHighlight && "bg-accent-light/20",
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      {profileIds.map((pid) => (
                        <div key={pid}>
                          {profileIds.length > 1 && (
                            <p className="mb-1 text-[10px] font-medium uppercase text-text-muted">
                              {profileNames[pid] ?? `Profile ${pid}`}
                            </p>
                          )}
                          {planDay == null ? (
                            <div className={emptyCellClass} aria-hidden />
                          ) : (
                            <PlannerSlot
                              plan={plan}
                              dayNumber={planDay}
                              mealType={mt}
                              profileId={pid}
                              recipesById={recipesById}
                              dimmed={dimProfileId(pid)}
                              onRemoveEntry={onRemoveEntry}
                              onOpenRecipe={onOpenRecipe}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-surface-muted">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface-muted px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-primary"
              >
                Day total
              </th>
              {columnMeta.map(({ colIdx, planDay, colHighlight }) => {
                const hasMeals = columnHasMeals(plan, planDay, totalsIds);
                const totals =
                  planDay != null && totalsIds.length
                    ? deriveDayTotals(plan, planDay, totalsIds)
                    : null;
                return (
                  <td
                    key={`total-${colIdx}`}
                    className={cn(
                      "px-2 py-3 text-center align-middle tabular-nums",
                      colHighlight && "bg-accent-light/20",
                    )}
                  >
                    {hasMeals && totals ? (
                      <span className="text-base font-bold text-macro-kcal">
                        {formatMacroValue(totals.kcal, "kcal")}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
