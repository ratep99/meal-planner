import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { generateShoppingList } from "@/api/shopping";
import { MacroFooter } from "@/components/planner/MacroFooter";
import { PlannerGrid } from "@/components/planner/PlannerGrid";
import {
  PlannerToolbar,
  type PlannerProfileMode,
} from "@/components/planner/PlannerToolbar";
import {
  PlannerWeekActionDialog,
  type WeekExportSelection,
} from "@/components/planner/PlannerWeekActionDialog";
import { RecipeQuickModal } from "@/components/planner/RecipeQuickModal";
import { RecipeSidebar } from "@/components/planner/RecipeSidebar";
import { ProfileSwitcher } from "@/components/shared/ProfileSwitcher";
import { resolveApiUrl } from "@/lib/api";
import {
  deriveDayTotals,
  findDayNumberForEntry,
  findEntryById,
  parseEntryDragId,
  parseRecipeDragId,
  parseSlotId,
  profileTargetsFromUser,
} from "@/lib/planner";
import {
  addDays,
  formatWeekdayRowLabel,
  getPlanDayNumber,
  minDaysCountForVisibleWeek,
  startOfWeekMonday,
  toIsoDateLocal,
} from "@/lib/week-utils";
import {
  useAssignRecipe,
  useCreateMealPlan,
  useMealPlan,
  useMealPlanSummary,
  useMealPlans,
  useRemoveEntry,
  useUpdateMealPlan,
} from "@/hooks/useMealPlan";
import { useProfiles } from "@/hooks/useProfiles";
import { useRecipes } from "@/hooks/useRecipes";
import type { MealType } from "@/types/enums";
import type { MealPlanDetail, MealPlanEntry } from "@/types/mealplan";
import type { Macros } from "@/types/recipe";

function resolveDropTarget(
  overId: string | undefined,
  plan: MealPlanDetail,
): { day: number; mealType: MealType; profileId: number } | null {
  if (!overId) return null;
  const slot = parseSlotId(overId);
  if (slot) return slot;
  const eid = parseEntryDragId(overId);
  if (eid == null) return null;
  const e = findEntryById(plan, eid);
  if (!e) return null;
  const day = findDayNumberForEntry(plan, eid);
  if (!day) return null;
  return { day, mealType: e.mealType, profileId: e.userProfileId };
}

type MealPlannerProps = {
  /** When set (e.g. from `/planner/:mealPlanId`), selects this plan once lists load. */
  initialPlanId?: number;
};

export default function MealPlanner({ initialPlanId }: MealPlannerProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: plans, isLoading: plansLoading } = useMealPlans();
  const { data: profiles } = useProfiles();
  const { data: recipes = [] } = useRecipes();
  const recipesById = useMemo(
    () => new Map(recipes.map((r) => [r.id, r] as const)),
    [recipes],
  );

  const weekMonday = useMemo(() => startOfWeekMonday(new Date()), []);

  const [planId, setPlanId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [profileMode, setProfileMode] = useState<PlannerProfileMode>("first");
  const [modalRecipeId, setModalRecipeId] = useState<number | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [shoppingDialogOpen, setShoppingDialogOpen] = useState(false);
  const [shoppingPending, setShoppingPending] = useState(false);

  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan();
  const { isPending: planUpdatePending } = updatePlan;
  const assignRecipe = useAssignRecipe();
  const removeEntry = useRemoveEntry();
  const autoCreateRef = useRef(false);
  const weekAlignToastRef = useRef<number | null>(null);

  const { data: plan, isLoading: planLoading } = useMealPlan(planId ?? undefined);
  const { data: summary } = useMealPlanSummary(planId ?? undefined);

  useEffect(() => {
    if (plansLoading || !plans?.length) return;
    if (initialPlanId != null) {
      const ok = plans.some((p) => p.id === initialPlanId);
      setPlanId(ok ? initialPlanId : plans[0].id);
      return;
    }
    setPlanId((current) => (current != null ? current : plans[0].id));
  }, [plans, plansLoading, initialPlanId]);

  useEffect(() => {
    if (plansLoading || plans?.length || !profiles?.length) return;
    if (autoCreateRef.current) return;
    autoCreateRef.current = true;
    void createPlan
      .mutateAsync({
        name: "Weekly plan",
        daysCount: 7,
        startDate: toIsoDateLocal(startOfWeekMonday(new Date())),
        userProfileIds: profiles.map((p) => p.id),
      })
      .then((created) => {
        setPlanId(created.id);
      })
      .catch(() => {
        autoCreateRef.current = false;
      });
  }, [plans, plansLoading, profiles, createPlan]);

  /** Short plans (e.g. backend default `daysCount: 3`) leave Thu–Sun outside the window — extend to cover Mon–Sun. */
  useEffect(() => {
    if (!plan || planLoading || planUpdatePending || createPlan.isPending) return;
    const res = minDaysCountForVisibleWeek(plan.startDate, weekMonday);
    if ("blocked" in res) {
      if (weekAlignToastRef.current !== plan.id) {
        weekAlignToastRef.current = plan.id;
        toast.message("Plan start is after this Monday", {
          description:
            "Move the meal plan start date to this week’s Monday (or earlier) so all columns are usable, or create a new weekly plan.",
        });
      }
      return;
    }
    if (res.daysCount <= plan.daysCount) return;
    void updatePlan
      .mutateAsync({
        id: plan.id,
        payload: { daysCount: res.daysCount },
      })
      .then(() => {
        toast.success("Plan extended to cover the full week (Mon–Sun).");
      })
      .catch(() => {
        toast.error("Could not extend the plan. Check that the API allows updating daysCount.");
      });
  }, [
    plan,
    planLoading,
    planUpdatePending,
    createPlan.isPending,
    weekMonday,
    updatePlan,
  ]);

  useEffect(() => {
    if (!plan) return;
    setSelectedDay((d) => Math.min(d, plan.daysCount));
  }, [plan]);

  const highlightedPlanDay = useMemo(() => {
    const raw = searchParams.get("day");
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  }, [searchParams]);

  useEffect(() => {
    if (highlightedPlanDay == null || !plan) return;
    if (highlightedPlanDay <= plan.daysCount) {
      setSelectedDay(highlightedPlanDay);
    }
  }, [highlightedPlanDay, plan]);

  const daySummaryLabel = useMemo(() => {
    if (!plan) return undefined;
    for (let i = 0; i < 7; i += 1) {
      const cellDate = addDays(weekMonday, i);
      const pn = getPlanDayNumber(
        plan.startDate,
        plan.daysCount,
        cellDate,
      );
      if (pn === selectedDay) return formatWeekdayRowLabel(weekMonday, i);
    }
    return `Day ${selectedDay}`;
  }, [plan, weekMonday, selectedDay]);

  const p0 = profiles?.[0];
  const p1 = profiles?.[1];

  const profileNames = useMemo(() => {
    const m: Record<number, string> = {};
    profiles?.forEach((p) => {
      m[p.id] = p.displayName;
    });
    return m;
  }, [profiles]);

  const dimProfileId = useCallback(
    (pid: number) => {
      if (!p0 || !p1) return false;
      if (profileMode === "both") return false;
      if (profileMode === "first") return pid !== p0.id;
      return pid !== p1.id;
    },
    [p0, p1, profileMode],
  );

  /** Profiles summed in each “Day total” column (aligned with Macro footer context). */
  const plannerTotalsProfileIds = useMemo(() => {
    if (profileMode === "both" && p0 && p1) return [p0.id, p1.id];
    if (profileMode === "second" && p1) return [p1.id];
    if (p0) return [p0.id];
    return [];
  }, [profileMode, p0, p1]);

  const footerTotalsAndTargets = useMemo((): {
    totals: Macros;
    targets: Macros;
  } => {
    if (!plan) {
      return {
        totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        targets: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }

    const dayRow = summary?.days.find((d) => d.dayNumber === selectedDay);
    const modeIds =
      profileMode === "both" && p0 && p1
        ? [p0.id, p1.id]
        : profileMode === "second" && p1
          ? [p1.id]
          : p0
            ? [p0.id]
            : [];

    if (dayRow && modeIds.length && dayRow.byProfile) {
      const totalsList: Macros[] = [];
      const targetsList: Macros[] = [];
      for (const id of modeIds) {
        const cell = dayRow.byProfile?.[id];
        if (cell) {
          totalsList.push(cell.totals);
          targetsList.push(cell.targets);
        }
      }
      if (totalsList.length && targetsList.length) {
        return {
          totals: totalsList.reduce(
            (a, m) => ({
              kcal: a.kcal + m.kcal,
              protein: a.protein + m.protein,
              carbs: a.carbs + m.carbs,
              fat: a.fat + m.fat,
            }),
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          ),
          targets: targetsList.reduce(
            (a, m) => ({
              kcal: a.kcal + m.kcal,
              protein: a.protein + m.protein,
              carbs: a.carbs + m.carbs,
              fat: a.fat + m.fat,
            }),
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          ),
        };
      }
    }

    const ids =
      profileMode === "both" && p0 && p1
        ? [p0.id, p1.id]
        : profileMode === "second" && p1
          ? [p1.id]
          : p0
            ? [p0.id]
            : [];
    const derived = deriveDayTotals(plan, selectedDay, ids) ?? {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    let targets: Macros = {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    for (const id of ids) {
      const pr = profiles?.find((x) => x.id === id);
      if (pr) {
        const t = profileTargetsFromUser(
          pr.calculatedKcal,
          pr.targetProtein,
          pr.targetCarbs,
          pr.targetFat,
        );
        targets = {
          kcal: targets.kcal + t.kcal,
          protein: targets.protein + t.protein,
          carbs: targets.carbs + t.carbs,
          fat: targets.fat + t.fat,
        };
      }
    }
    return { totals: derived, targets };
  }, [plan, summary, selectedDay, profileMode, p0, p1, profiles]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!plan || !over) return;

    const overId = String(over.id);
    const target = resolveDropTarget(overId, plan);
    if (!target) return;

    const activeId = String(active.id);
    const recipeId = parseRecipeDragId(activeId);
    const draggedEntryId = parseEntryDragId(activeId);

    try {
      if (recipeId != null) {
        await assignRecipe.mutateAsync({
          mealPlanId: plan.id,
          dayNumber: target.day,
          payload: {
            recipeId,
            mealType: target.mealType,
            userProfileId: target.profileId,
          },
        });
        return;
      }

      if (draggedEntryId == null) return;

      const dragged = findEntryById(plan, draggedEntryId);
      if (!dragged) return;

      const fromDay = findDayNumberForEntry(plan, draggedEntryId);
      if (!fromDay) return;

      const sameSlot =
        fromDay === target.day &&
        dragged.mealType === target.mealType &&
        dragged.userProfileId === target.profileId;
      if (sameSlot) return;

      const occupied = findSlotEntry(
        plan,
        target.day,
        target.mealType,
        target.profileId,
      );

      if (occupied && occupied.id !== dragged.id) {
        await removeEntry.mutateAsync({
          mealPlanId: plan.id,
          dayNumber: fromDay,
          entryId: dragged.id,
        });
        await removeEntry.mutateAsync({
          mealPlanId: plan.id,
          dayNumber: target.day,
          entryId: occupied.id,
        });
        await assignRecipe.mutateAsync({
          mealPlanId: plan.id,
          dayNumber: fromDay,
          payload: {
            recipeId: occupied.recipeId,
            mealType: dragged.mealType,
            userProfileId: dragged.userProfileId,
          },
        });
        await assignRecipe.mutateAsync({
          mealPlanId: plan.id,
          dayNumber: target.day,
          payload: {
            recipeId: dragged.recipeId,
            mealType: target.mealType,
            userProfileId: target.profileId,
          },
        });
        return;
      }

      await removeEntry.mutateAsync({
        mealPlanId: plan.id,
        dayNumber: fromDay,
        entryId: dragged.id,
      });
      await assignRecipe.mutateAsync({
        mealPlanId: plan.id,
        dayNumber: target.day,
        payload: {
          recipeId: dragged.recipeId,
          mealType: target.mealType,
          userProfileId: target.profileId,
        },
      });
    } catch {
      toast.error("Could not update planner");
    }
  };

  function findSlotEntry(
    p: MealPlanDetail,
    day: number,
    mealType: MealType,
    profileId: number,
  ): MealPlanEntry | undefined {
    const d = p.days.find((x) => x.dayNumber === day);
    return d?.entries.find(
      (e) => e.mealType === mealType && e.userProfileId === profileId,
    );
  }

  const onPdfDialogConfirm = (_sel: WeekExportSelection) => {
    if (!planId || !plan) return;
    let opened = false;
    for (let i = 0; i < 7; i += 1) {
      if (!_sel.weekdays[i]) continue;
      const planDay = getPlanDayNumber(
        plan.startDate,
        plan.daysCount,
        addDays(weekMonday, i),
      );
      if (planDay == null) continue;
      window.open(
        resolveApiUrl(`/api/pdf/mealplan/${planId}/day/${planDay}`),
        "_blank",
      );
      opened = true;
    }
    if (!opened) {
      toast.error(
        "No plan days fall on the selected weekdays in this calendar week.",
      );
    }
    setPdfDialogOpen(false);
  };

  const onShoppingDialogConfirm = async (sel: WeekExportSelection) => {
    if (!planId || !plan) return;
    const dates: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      if (!sel.weekdays[i]) continue;
      const cellDate = addDays(weekMonday, i);
      if (
        getPlanDayNumber(plan.startDate, plan.daysCount, cellDate) != null
      ) {
        dates.push(cellDate);
      }
    }
    if (!dates.length) {
      toast.error(
        "No plan days fall on the selected weekdays in this calendar week.",
      );
      return;
    }
    dates.sort((a, b) => a.getTime() - b.getTime());
    setShoppingPending(true);
    try {
      const res = await generateShoppingList({
        mealPlanIds: [planId],
        dateRangeStart: toIsoDateLocal(dates[0]),
        dateRangeEnd: toIsoDateLocal(dates[dates.length - 1]),
      });
      toast.success("Shopping list created");
      navigate(`/shopping/${res.id}`);
    } catch {
      toast.error("Could not generate shopping list");
    } finally {
      setShoppingPending(false);
      setShoppingDialogOpen(false);
    }
  };

  if (plansLoading || planLoading) {
    return (
      <p className="text-text-secondary" role="status">
        Loading planner…
      </p>
    );
  }

  if (!plan) {
    return (
      <p className="text-text-secondary">
        Create profiles first, then a meal plan will appear here.
      </p>
    );
  }

  const profileIds =
    plan.userProfileIds?.length > 0
      ? plan.userProfileIds
      : profiles?.map((p) => p.id) ?? [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div className="flex flex-col gap-2 pb-28">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <h1 className="font-display text-3xl text-text-primary">
            Meal Planner
          </h1>
          <div className="lg:max-w-sm">
            <ProfileSwitcher className="border-0 pt-0" />
          </div>
        </div>

        <PlannerToolbar
          name={plan.name}
          onNameCommit={(n) => {
            void updatePlan.mutateAsync({ id: plan.id, payload: { name: n } });
          }}
          profiles={profiles ?? []}
          profileMode={profileMode}
          onProfileModeChange={setProfileMode}
          onOpenShoppingDialog={() => setShoppingDialogOpen(true)}
          onOpenPdfDialog={() => setPdfDialogOpen(true)}
          shoppingPending={shoppingPending}
        />

        <div className="flex min-h-[min(70vh,900px)] flex-col gap-4 lg:flex-row">
          <PlannerGrid
            plan={plan}
            weekMonday={weekMonday}
            highlightedPlanDay={highlightedPlanDay}
            profileIds={profileIds}
            totalsProfileIds={plannerTotalsProfileIds}
            profileNames={profileNames}
            recipesById={recipesById}
            dimProfileId={dimProfileId}
            onRemoveEntry={(dayNumber, entryId) => {
              void removeEntry.mutateAsync({
                mealPlanId: plan.id,
                dayNumber,
                entryId,
              });
            }}
            onOpenRecipe={(id) => setModalRecipeId(id)}
          />
          <RecipeSidebar recipes={recipes} />
        </div>
      </div>

      <MacroFooter
        selectedDay={selectedDay}
        totalDays={plan.daysCount}
        daySummaryLabel={daySummaryLabel}
        onDayChange={setSelectedDay}
        totals={footerTotalsAndTargets.totals}
        targets={footerTotalsAndTargets.targets}
      />

      <PlannerWeekActionDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        title="Export PDF"
        description="Pick profile context and weekdays. One PDF opens per selected day that exists in the plan window (Mon–Sun grid)."
        profiles={profiles ?? []}
        confirmLabel="Export PDF"
        onConfirm={onPdfDialogConfirm}
      />
      <PlannerWeekActionDialog
        open={shoppingDialogOpen}
        onClose={() => setShoppingDialogOpen(false)}
        title="Generate shopping list"
        description="Pick profile context and weekdays. The list uses your meal plan for the selected date range (backend may include adjacent plan days)."
        profiles={profiles ?? []}
        confirmLabel="Generate list"
        pending={shoppingPending}
        onConfirm={(sel) => void onShoppingDialogConfirm(sel)}
      />

      <RecipeQuickModal
        recipeId={modalRecipeId}
        open={modalRecipeId != null}
        onClose={() => setModalRecipeId(null)}
      />

      <DragOverlay>{null}</DragOverlay>
    </DndContext>
  );
}
