import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as mealPlansApi from "@/api/mealplans";
import { mealPlanKeys } from "@/hooks/meal-plans/keys";
import { recipeKeys } from "@/hooks/recipes/keys";
import type {
  AssignRecipePayload,
  CreateMealPlanPayload,
  MealPlan,
  MealPlanDetail,
  MealPlanEntry,
  UpdateMealPlanEntryPayload,
  UpdateMealPlanPayload,
} from "@/types/mealplan";
import type { RecipeListItem } from "@/types/recipe";

export function useMealPlans() {
  return useQuery({
    queryKey: mealPlanKeys.list(),
    queryFn: mealPlansApi.fetchMealPlans,
  });
}

export function useMealPlan(id: number | undefined) {
  return useQuery({
    queryKey: mealPlanKeys.detail(id ?? -1),
    queryFn: () => mealPlansApi.fetchMealPlan(id!),
    enabled: id != null && id > 0,
  });
}

export function useMealPlanSummary(id: number | undefined) {
  return useQuery({
    queryKey: mealPlanKeys.summary(id ?? -1),
    queryFn: () => mealPlansApi.fetchMealPlanSummary(id!),
    enabled: id != null && id > 0,
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealPlansApi.createMealPlan,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
    onError: () => toast.error("Could not create meal plan"),
  });
}

export function useUpdateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateMealPlanPayload;
    }) => mealPlansApi.updateMealPlan(id, payload),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: mealPlanKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: mealPlanKeys.summary(id) });
      void qc.invalidateQueries({ queryKey: mealPlanKeys.list() });
    },
    onError: () => toast.error("Could not update meal plan"),
  });
}

function patchPlan(
  plan: MealPlanDetail,
  dayNumber: number,
  updater: (entries: MealPlanEntry[]) => MealPlanEntry[],
): MealPlanDetail {
  return {
    ...plan,
    days: plan.days.map((d) =>
      d.dayNumber === dayNumber
        ? { ...d, entries: updater(d.entries) }
        : d,
    ),
  };
}

export function useAssignRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      dayNumber,
      payload,
    }: {
      mealPlanId: number;
      dayNumber: number;
      payload: AssignRecipePayload;
    }) =>
      mealPlansApi.assignRecipeToSlot(mealPlanId, dayNumber, payload),
    onMutate: async ({ mealPlanId, dayNumber, payload }) => {
      await qc.cancelQueries({ queryKey: mealPlanKeys.detail(mealPlanId) });
      const previous = qc.getQueryData<MealPlanDetail>(
        mealPlanKeys.detail(mealPlanId),
      );
      if (previous) {
        const tempId = -Date.now();
        const day = previous.days.find((d) => d.dayNumber === dayNumber);
        const recipes = qc.getQueryData<RecipeListItem[]>(recipeKeys.list());
        const fromList = recipes?.find((r) => r.id === payload.recipeId);
        const optimistic: MealPlanEntry = {
          id: tempId,
          mealPlanDayId: day?.id ?? 0,
          userProfileId: payload.userProfileId,
          recipeId: payload.recipeId,
          mealType: payload.mealType,
          scalingFactor: 0,
          calculatedKcal: 0,
          calculatedProtein: 0,
          calculatedCarbs: 0,
          calculatedFat: 0,
          recipe:
            fromList ??
            ({
              id: payload.recipeId,
              name: `Recipe #${payload.recipeId}`,
              mealType: payload.mealType,
              description: null,
              prepTimeMin: null,
              createdAt: "",
              updatedAt: "",
            } satisfies RecipeListItem),
        };
        qc.setQueryData<MealPlanDetail>(
          mealPlanKeys.detail(mealPlanId),
          (old) => {
            if (!old) return old;
            return patchPlan(old, dayNumber, (entries) => {
              const idx = entries.findIndex(
                (e) =>
                  e.mealType === payload.mealType &&
                  e.userProfileId === payload.userProfileId,
              );
              const next = [...entries];
              if (idx >= 0) next[idx] = optimistic;
              else next.push(optimistic);
              return next;
            });
          },
        );
      }
      return { previous };
    },
    onError: (_e, { mealPlanId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(mealPlanKeys.detail(mealPlanId), ctx.previous);
      }
      toast.error("Could not assign recipe");
    },
    onSettled: (_d, _e, { mealPlanId }) => {
      void qc.invalidateQueries({ queryKey: mealPlanKeys.detail(mealPlanId) });
      void qc.invalidateQueries({ queryKey: mealPlanKeys.summary(mealPlanId) });
    },
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealPlansApi.deleteMealPlan,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: mealPlanKeys.list() });
      const previous = qc.getQueryData<MealPlan[]>(mealPlanKeys.list());
      qc.setQueryData(mealPlanKeys.list(), (old) =>
        Array.isArray(old) ? old.filter((p) => p.id !== id) : old,
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(mealPlanKeys.list(), ctx.previous);
      }
      toast.error("Could not delete meal plan");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
    onSuccess: () => {
      toast.success("Meal plan deleted");
    },
  });
}

export function useUpdateMealPlanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      dayNumber,
      entryId,
      payload,
    }: {
      mealPlanId: number;
      dayNumber: number;
      entryId: number;
      payload: UpdateMealPlanEntryPayload;
    }) =>
      mealPlansApi.updateMealPlanEntry(
        mealPlanId,
        dayNumber,
        entryId,
        payload,
      ),
    onSuccess: (_d, { mealPlanId }) => {
      void qc.invalidateQueries({ queryKey: mealPlanKeys.detail(mealPlanId) });
      void qc.invalidateQueries({ queryKey: mealPlanKeys.summary(mealPlanId) });
    },
    onError: () => toast.error("Could not update meal plan entry"),
  });
}

export function useRemoveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      dayNumber,
      entryId,
    }: {
      mealPlanId: number;
      dayNumber: number;
      entryId: number;
    }) =>
      mealPlansApi.removeMealPlanEntry(mealPlanId, dayNumber, entryId),
    onMutate: async ({ mealPlanId, dayNumber, entryId }) => {
      await qc.cancelQueries({ queryKey: mealPlanKeys.detail(mealPlanId) });
      const previous = qc.getQueryData<MealPlanDetail>(
        mealPlanKeys.detail(mealPlanId),
      );
      if (previous) {
        qc.setQueryData<MealPlanDetail>(
          mealPlanKeys.detail(mealPlanId),
          (old) => {
            if (!old) return old;
            return patchPlan(old, dayNumber, (entries) =>
              entries.filter((e) => e.id !== entryId),
            );
          },
        );
      }
      return { previous };
    },
    onError: (_e, { mealPlanId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(mealPlanKeys.detail(mealPlanId), ctx.previous);
      }
      toast.error("Could not remove entry");
    },
    onSettled: (_d, _e, { mealPlanId }) => {
      void qc.invalidateQueries({ queryKey: mealPlanKeys.detail(mealPlanId) });
      void qc.invalidateQueries({ queryKey: mealPlanKeys.summary(mealPlanId) });
    },
  });
}

export type { CreateMealPlanPayload };
