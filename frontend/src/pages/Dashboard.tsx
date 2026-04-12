import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useActiveProfile } from "@/context/active-profile-context";
import { useMealPlan, useMealPlans } from "@/hooks/useMealPlan";
import { useRecipes } from "@/hooks/useRecipes";
import { findTodayDayNumber } from "@/lib/dashboard-plan";
import { deriveDayTotals } from "@/lib/planner";
import { formatMacroValue } from "@/lib/macros";
import type { Macros } from "@/types/recipe";
import {
  addDays,
  getPlanDayNumber,
  startOfWeekMonday,
  WEEKDAY_LABELS_SHORT,
} from "@/lib/week-utils";
import { MEAL_TYPES, type MealType } from "@/types/enums";
import type { MealPlanDetail, MealPlanEntry } from "@/types/mealplan";
import { cn } from "@/lib/utils";

const MEAL_ROW_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

function entriesForDayProfile(
  plan: MealPlanDetail,
  dayNumber: number,
  profileId: number,
): MealPlanEntry[] {
  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return [];
  return day.entries.filter((e) => e.userProfileId === profileId);
}

function entryForMealType(
  entries: MealPlanEntry[],
  mealType: MealType,
): MealPlanEntry | undefined {
  return entries.find((e) => e.mealType === mealType);
}

function entryDisplayName(
  entry: MealPlanEntry,
  recipesById: Map<number, { name: string }>,
): string {
  return (
    entry.recipe?.name?.trim() ||
    recipesById.get(entry.recipeId)?.name ||
    `Recipe #${entry.recipeId}`
  );
}

function emptyMacros(): Macros {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

type WeekColumn = {
  colIdx: number;
  weekdayShort: string;
  planDay: number | null;
  entries: MealPlanEntry[];
  totals: Macros;
  hasAnyMeal: boolean;
};

export default function Dashboard() {
  const { data: plans = [], isLoading: plansLoading } = useMealPlans();
  const { data: recipes = [] } = useRecipes();
  const {
    activeProfileId,
    setActiveProfileId,
    profiles = [],
  } = useActiveProfile();

  const recipesById = useMemo(
    () => new Map(recipes.map((r) => [r.id, r] as const)),
    [recipes],
  );

  const planId = useMemo(() => {
    for (const p of plans) {
      if (findTodayDayNumber(p) != null) return p.id;
    }
    return plans[0]?.id;
  }, [plans]);

  const { data: planDetail, isLoading: planLoading } = useMealPlan(planId);

  const weekMonday = useMemo(() => startOfWeekMonday(new Date()), []);

  const weekColumns = useMemo((): WeekColumn[] => {
    if (!planDetail) {
      return Array.from({ length: 7 }, (_, colIdx) => ({
        colIdx,
        weekdayShort: WEEKDAY_LABELS_SHORT[colIdx],
        planDay: null,
        entries: [],
        totals: emptyMacros(),
        hasAnyMeal: false,
      }));
    }

    const pid = activeProfileId;
    return Array.from({ length: 7 }, (_, colIdx) => {
      const cellDate = addDays(weekMonday, colIdx);
      const planDay = getPlanDayNumber(
        planDetail.startDate,
        planDetail.daysCount,
        cellDate,
      );
      const entries =
        pid != null && planDay != null
          ? entriesForDayProfile(planDetail, planDay, pid)
          : [];
      const hasAnyMeal = entries.length > 0;
      const totals =
        pid != null && planDay != null
          ? deriveDayTotals(planDetail, planDay, [pid]) ?? emptyMacros()
          : emptyMacros();
      return {
        colIdx,
        weekdayShort: WEEKDAY_LABELS_SHORT[colIdx],
        planDay,
        entries,
        totals,
        hasAnyMeal,
      };
    });
  }, [planDetail, weekMonday, activeProfileId]);

  const averageDailyMacros = useMemo(() => {
    const withMeals = weekColumns.filter((c) => c.hasAnyMeal);
    if (!withMeals.length) return emptyMacros();
    const sum = withMeals.reduce(
      (acc, c) => ({
        kcal: acc.kcal + c.totals.kcal,
        protein: acc.protein + c.totals.protein,
        carbs: acc.carbs + c.totals.carbs,
        fat: acc.fat + c.totals.fat,
      }),
      emptyMacros(),
    );
    const n = withMeals.length;
    return {
      kcal: sum.kcal / n,
      protein: sum.protein / n,
      carbs: sum.carbs / n,
      fat: sum.fat / n,
    };
  }, [weekColumns]);

  const loading = plansLoading || (planId != null && planLoading);

  const emptyCellClass =
    "flex min-h-[4.5rem] items-center justify-center rounded-md border-2 border-dashed border-border bg-surface-muted/30 px-2 py-2";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Weekly overview (read-only) — edit in the planner
          </p>
        </div>

        {profiles.length > 1 && (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Active profile"
          >
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activeProfileId === p.id}
                onClick={() => setActiveProfileId(p.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  activeProfileId === p.id
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border bg-surface-muted text-text-secondary hover:border-accent/40",
                )}
              >
                {p.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p className="text-text-secondary" role="status">
          Loading…
        </p>
      )}

      {!loading && !planDetail && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/50 p-8 text-center text-text-secondary">
          <p>No meal plan yet.</p>
          <Link to="/planner" className="mt-3 inline-block text-accent underline">
            Open planner
          </Link>
        </div>
      )}

      {!loading && planDetail && (
        <div className="space-y-4">
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
                  {weekColumns.map((c) => (
                    <th
                      key={c.colIdx}
                      scope="col"
                      className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted"
                    >
                      {c.weekdayShort}
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
                    {weekColumns.map((c) => {
                      const entry = entryForMealType(c.entries, mt);
                      const inPlan =
                        c.planDay != null && activeProfileId != null;
                      const filled = inPlan && entry != null;

                      return (
                        <td key={c.colIdx} className="align-top px-2 py-3">
                          {!inPlan || !filled ? (
                            <div className={emptyCellClass} aria-hidden />
                          ) : (
                            <Link
                              to="/planner"
                              className="block min-h-[4.5rem] rounded-md border border-border bg-surface-muted/50 px-2 py-2 transition-colors hover:border-accent hover:bg-accent-light/20"
                            >
                              <p className="text-sm font-medium leading-snug text-text-primary">
                                {entryDisplayName(entry, recipesById)}
                              </p>
                              <p className="mt-1 text-xs text-text-muted">
                                {Math.round(entry.calculatedKcal)} kcal
                              </p>
                            </Link>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-surface-muted">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface-muted px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-primary"
                  >
                    Day total
                  </th>
                  {weekColumns.map((c) => (
                    <td
                      key={c.colIdx}
                      className="px-2 py-3 text-center align-middle tabular-nums"
                    >
                      {c.hasAnyMeal ? (
                        <span className="text-base font-bold text-macro-kcal">
                          {formatMacroValue(c.totals.kcal, "kcal")}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Avg/day</span>
            {" — "}
            <span className="text-macro-kcal">
              Kcal: {formatMacroValue(averageDailyMacros.kcal, "kcal")}
            </span>
            <span className="mx-2 text-text-muted">|</span>
            <span className="text-macro-protein">
              P: {formatMacroValue(averageDailyMacros.protein, "g")}g
            </span>
            <span className="mx-2 text-text-muted">|</span>
            <span className="text-macro-carbs">
              C: {formatMacroValue(averageDailyMacros.carbs, "g")}g
            </span>
            <span className="mx-2 text-text-muted">|</span>
            <span className="text-macro-fat">
              F: {formatMacroValue(averageDailyMacros.fat, "g")}g
            </span>
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/recipes/new">
              <Button type="button" variant="outline">
                New recipe
              </Button>
            </Link>
            <Link to="/planner">
              <Button type="button" variant="outline">
                Open planner
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
