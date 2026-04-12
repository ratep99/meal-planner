import { api } from "@/lib/api";
import type { MealType } from "@/types/enums";
import type {
  AssignRecipePayload,
  CreateMealPlanPayload,
  MealPlan,
  MealPlanDetail,
  MealPlanEntry,
  MealPlanSummary,
  UpdateMealPlanEntryPayload,
  UpdateMealPlanPayload,
} from "@/types/mealplan";
import type { RecipeListItem } from "@/types/recipe";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeEntryRecipe(
  row: Record<string, unknown>,
  recipeId: number,
): MealPlanEntry["recipe"] {
  const nested = row.recipe ?? row.recipeDto ?? row.recipeSummary ?? null;
  const flatName =
    typeof row.recipeName === "string"
      ? row.recipeName
      : typeof row.recipe_name === "string"
        ? row.recipe_name
        : undefined;

  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const r = nested as Record<string, unknown>;
    const id = num(r.id, recipeId) || recipeId;
    const name =
      (typeof r.name === "string" && r.name.trim()) ||
      flatName?.trim() ||
      "";
    const mealType = (r.mealType ?? r.meal_type ?? "LUNCH") as MealType;
    const prepRaw = r.prepTimeMin ?? r.prep_time_min;
    const prepTimeMin =
      prepRaw == null || prepRaw === ""
        ? null
        : num(prepRaw, NaN);
    return {
      id,
      name: name || `Recipe #${recipeId}`,
      mealType,
      description:
        typeof r.description === "string"
          ? r.description
          : r.description === null
            ? null
            : null,
      prepTimeMin: Number.isFinite(prepTimeMin) ? prepTimeMin : null,
      imageFilename:
        typeof r.imageFilename === "string"
          ? r.imageFilename
          : typeof r.image_filename === "string"
            ? r.image_filename
            : null,
      createdAt:
        typeof r.createdAt === "string"
          ? r.createdAt
          : typeof r.created_at === "string"
            ? r.created_at
            : "",
      updatedAt:
        typeof r.updatedAt === "string"
          ? r.updatedAt
          : typeof r.updated_at === "string"
            ? r.updated_at
            : "",
      macros: (r.macros ?? undefined) as RecipeListItem["macros"],
    };
  }

  if (flatName?.trim()) {
    return {
      id: recipeId,
      name: flatName.trim(),
      mealType: "LUNCH",
      description: null,
      prepTimeMin: null,
      createdAt: "",
      updatedAt: "",
    };
  }

  return undefined;
}

function normalizeMealPlanEntry(raw: unknown): MealPlanEntry {
  const e = (raw ?? {}) as Record<string, unknown>;
  const recipeId = num(e.recipeId ?? e.recipe_id, 0);
  return {
    id: num(e.id, 0),
    mealPlanDayId: num(e.mealPlanDayId ?? e.meal_plan_day_id, 0),
    userProfileId: num(e.userProfileId ?? e.user_profile_id, 0),
    recipeId,
    mealType: (e.mealType ?? e.meal_type) as MealType,
    scalingFactor: num(e.scalingFactor ?? e.scaling_factor, 0),
    calculatedKcal: num(e.calculatedKcal ?? e.calculated_kcal, 0),
    calculatedProtein: num(e.calculatedProtein ?? e.calculated_protein, 0),
    calculatedCarbs: num(e.calculatedCarbs ?? e.calculated_carbs, 0),
    calculatedFat: num(e.calculatedFat ?? e.calculated_fat, 0),
    recipe: normalizeEntryRecipe(e, recipeId),
  };
}

function normalizeMealPlanDetail(raw: MealPlanDetail): MealPlanDetail {
  const days = (raw.days ?? []).map((d) => ({
    ...d,
    entries: (d.entries ?? []).map((en) => normalizeMealPlanEntry(en)),
  }));
  return { ...raw, days };
}

export async function fetchMealPlans(): Promise<MealPlan[]> {
  const { data } = await api.get<MealPlan[]>("/api/mealplans");
  return data;
}

export async function fetchMealPlan(id: number): Promise<MealPlanDetail> {
  const { data } = await api.get<MealPlanDetail>(`/api/mealplans/${id}`);
  return normalizeMealPlanDetail(data);
}

export async function fetchMealPlanSummary(id: number): Promise<MealPlanSummary> {
  const { data } = await api.get<unknown>(`/api/mealplans/${id}/summary`);
  return normalizeSummary(id, data);
}

function normalizeSummary(
  mealPlanId: number,
  raw: unknown,
): MealPlanSummary {
  if (raw && typeof raw === "object" && "days" in raw) {
    const r = raw as MealPlanSummary;
    if (Array.isArray(r.days)) {
      const days: MealPlanSummary["days"] = r.days.map((day) => {
        if (!day || typeof day !== "object") {
          return { dayNumber: 0, byProfile: {} };
        }
        const d = day as Record<string, unknown>;
        const bp = d.byProfile;
        const byProfile =
          bp && typeof bp === "object" && !Array.isArray(bp)
            ? (bp as MealPlanSummary["days"][number]["byProfile"])
            : {};
        return {
          dayNumber: Number(d.dayNumber) || 0,
          byProfile,
        };
      });
      return { mealPlanId: r.mealPlanId ?? mealPlanId, days };
    }
  }
  return { mealPlanId, days: [] };
}

export async function createMealPlan(
  payload: CreateMealPlanPayload,
): Promise<MealPlanDetail> {
  const { data } = await api.post<MealPlanDetail>("/api/mealplans", payload);
  return normalizeMealPlanDetail(data);
}

export async function updateMealPlan(
  id: number,
  payload: UpdateMealPlanPayload,
): Promise<MealPlanDetail> {
  const { data } = await api.put<MealPlanDetail>(`/api/mealplans/${id}`, payload);
  return normalizeMealPlanDetail(data);
}

export async function deleteMealPlan(id: number): Promise<void> {
  await api.delete(`/api/mealplans/${id}`);
}

export async function assignRecipeToSlot(
  mealPlanId: number,
  dayNumber: number,
  payload: AssignRecipePayload,
): Promise<MealPlanEntry> {
  const { data } = await api.post<MealPlanEntry>(
    `/api/mealplans/${mealPlanId}/days/${dayNumber}/entries`,
    payload,
  );
  return normalizeMealPlanEntry(data);
}

export async function updateMealPlanEntry(
  mealPlanId: number,
  dayNumber: number,
  entryId: number,
  payload: UpdateMealPlanEntryPayload,
): Promise<MealPlanEntry> {
  const { data } = await api.put<MealPlanEntry>(
    `/api/mealplans/${mealPlanId}/days/${dayNumber}/entries/${entryId}`,
    payload,
  );
  return normalizeMealPlanEntry(data);
}

export async function removeMealPlanEntry(
  mealPlanId: number,
  dayNumber: number,
  entryId: number,
): Promise<void> {
  await api.delete(
    `/api/mealplans/${mealPlanId}/days/${dayNumber}/entries/${entryId}`,
  );
}
