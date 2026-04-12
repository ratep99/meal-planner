import { api, resolveApiUrl } from "@/lib/api";
import type { Ingredient } from "@/types/ingredient";
import type { QuantityUnit } from "@/types/enums";
import { sanitizeMacros } from "@/lib/macros";
import type {
  CreateRecipeIngredientPayload,
  CreateRecipePayload,
  Macros,
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeListItem,
  UpdateRecipeIngredientPayload,
  UpdateRecipePayload,
} from "@/types/recipe";

function num(v: unknown, fallback = NaN): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickImageFilename(raw: Record<string, unknown>): string | null {
  const a = raw.imageFilename;
  const b = raw.image_filename;
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();
  return null;
}

function normalizeRecipe<T extends Recipe | RecipeListItem>(r: T): T {
  const raw = r as unknown as Record<string, unknown>;
  const imageFilename = pickImageFilename(raw);
  return { ...r, imageFilename };
}

function parseMacrosFromRecord(raw: Record<string, unknown>): Macros | undefined {
  const embedded =
    raw.macros ?? raw.macroSummary ?? raw.macro_summary ?? raw.totals;
  if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
    const o = embedded as Record<string, unknown>;
    const kcal = num(o.kcal ?? o.totalKcal ?? o.calories ?? o.total_calories, NaN);
    const protein = num(
      o.protein ?? o.totalProtein ?? o.total_protein,
      NaN,
    );
    const carbs = num(o.carbs ?? o.totalCarbs ?? o.total_carbs, NaN);
    const fat = num(o.fat ?? o.totalFat ?? o.total_fat, NaN);
    if ([kcal, protein, carbs, fat].every(Number.isFinite)) {
      return {
        kcal: kcal || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
      };
    }
  }

  const kcal = num(
    raw.totalKcal ?? raw.total_kcal ?? raw.calculatedKcal ?? raw.calculated_kcal,
    NaN,
  );
  const protein = num(raw.totalProtein ?? raw.total_protein, NaN);
  const carbs = num(raw.totalCarbs ?? raw.total_carbs, NaN);
  const fat = num(raw.totalFat ?? raw.total_fat, NaN);
  if (![kcal, protein, carbs, fat].every(Number.isFinite)) return undefined;
  return {
    kcal: kcal || 0,
    protein: protein || 0,
    carbs: carbs || 0,
    fat: fat || 0,
  };
}

function normalizeRecipeListItem(rawUnknown: unknown): RecipeListItem {
  const r = rawUnknown as RecipeListItem;
  const base = normalizeRecipe(r);
  const raw = rawUnknown as Record<string, unknown>;
  const macros = base.macros ?? parseMacrosFromRecord(raw);
  return macros ? { ...base, macros } : base;
}

function normalizeIngredientFromApi(
  raw: unknown,
  fallbackIngredientId?: number,
): Ingredient | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  let id = num(r.id, NaN);
  if (!Number.isFinite(id) && fallbackIngredientId != null) {
    id = fallbackIngredientId;
  }
  if (!Number.isFinite(id)) return undefined;

  const unitRaw = r.unitType ?? r.unit_type;
  const unitType =
    unitRaw === "WEIGHT" || unitRaw === "PIECE"
      ? unitRaw
      : ("WEIGHT" as Ingredient["unitType"]);

  const pwg = r.pieceWeightGrams ?? r.piece_weight_grams;
  const off = r.openFoodFactsId ?? r.open_food_facts_id;

  return {
    id,
    name: typeof r.name === "string" ? r.name : "",
    openFoodFactsId:
      off == null || off === ""
        ? null
        : typeof off === "string"
          ? off
          : String(off),
    source:
      r.source === "OPEN_FOOD_FACTS" || r.source === "MANUAL"
        ? r.source
        : "MANUAL",
    unitType,
    pieceWeightGrams:
      pwg == null ? null : Number.isFinite(Number(pwg)) ? Number(pwg) : null,
    kcalPer100g: num(r.kcalPer100g ?? r.kcal_per_100g, 0),
    proteinPer100g: num(r.proteinPer100g ?? r.protein_per_100g, 0),
    carbsPer100g: num(r.carbsPer100g ?? r.carbs_per_100g, 0),
    fatPer100g: num(r.fatPer100g ?? r.fat_per_100g, 0),
    fiberPer100g: num(r.fiberPer100g ?? r.fiber_per_100g, 0),
    category:
      typeof r.category === "string" ? (r.category as Ingredient["category"]) : "OTHER",
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.created_at === "string"
          ? r.created_at
          : "",
    manualOverride: Boolean(r.manualOverride ?? r.manual_override),
  };
}

function normalizeRecipeIngredientRow(raw: unknown): RecipeIngredient {
  const row = (raw ?? {}) as Record<string, unknown>;
  const ingredientId = num(row.ingredientId ?? row.ingredient_id, NaN);
  const nested =
    row.ingredient ??
    row.ingredientDto ??
    row.ingredientResponse ??
    row.ingredientEntity ??
    null;
  let ingredient = nested
    ? normalizeIngredientFromApi(nested, ingredientId)
    : undefined;

  const flatName =
    typeof row.ingredientName === "string"
      ? row.ingredientName
      : typeof row.ingredient_name === "string"
        ? row.ingredient_name
        : undefined;

  if (ingredient && flatName && !ingredient.name.trim()) {
    ingredient = { ...ingredient, name: flatName };
  }

  return {
    id: num(row.id, 0),
    recipeId: num(row.recipeId ?? row.recipe_id, 0),
    ingredientId: Number.isFinite(ingredientId) ? ingredientId : 0,
    quantity: num(row.quantity, 0),
    unit: row.unit as QuantityUnit,
    optional: Boolean(row.optional),
    ingredient,
    ingredientName: flatName ?? null,
  };
}

export async function fetchRecipes(): Promise<RecipeListItem[]> {
  const { data } = await api.get<unknown[]>("/api/recipes");
  return data.map((item) => normalizeRecipeListItem(item));
}

export async function fetchRecipe(id: number): Promise<RecipeDetail> {
  const { data } = await api.get<
    RecipeDetail & { ingredients?: RecipeIngredient[] }
  >(`/api/recipes/${id}`);
  const recipeIngredientsRaw =
    data.recipeIngredients ?? data.ingredients ?? [];
  const recipeIngredients = recipeIngredientsRaw.map(normalizeRecipeIngredientRow);
  const merged = { ...data, recipeIngredients };
  return normalizeRecipe(merged) as RecipeDetail;
}

export async function fetchRecipeMacros(id: number): Promise<Macros> {
  const { data } = await api.get<Record<string, unknown>>(
    `/api/recipes/${id}/macros`,
  );
  const parsed = parseMacrosFromRecord(data);
  if (parsed) return sanitizeMacros(parsed);
  return sanitizeMacros({
    kcal: num(data.kcal ?? data.totalKcal ?? data.calories, 0) || 0,
    protein: num(data.protein ?? data.totalProtein, 0) || 0,
    carbs: num(data.carbs ?? data.totalCarbs, 0) || 0,
    fat: num(data.fat ?? data.totalFat, 0) || 0,
  });
}

export async function createRecipe(
  payload: CreateRecipePayload,
): Promise<Recipe> {
  const { data } = await api.post<Recipe>("/api/recipes", payload);
  return normalizeRecipe(data);
}

export async function updateRecipe(
  id: number,
  payload: UpdateRecipePayload,
): Promise<Recipe> {
  const { data } = await api.put<Recipe>(`/api/recipes/${id}`, payload);
  return normalizeRecipe(data);
}

export async function deleteRecipe(id: number): Promise<void> {
  await api.delete(`/api/recipes/${id}`);
}

export async function uploadRecipeImage(id: number, file: File): Promise<void> {
  const url = resolveApiUrl(`/api/recipes/${id}/image`);
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.trim() || `${res.status} ${res.statusText}`);
  }
}

export async function addRecipeIngredient(
  recipeId: number,
  payload: CreateRecipeIngredientPayload,
) {
  const { data } = await api.post(
    `/api/recipes/${recipeId}/ingredients`,
    payload,
  );
  return data;
}

export async function updateRecipeIngredient(
  recipeId: number,
  ingredientRowId: number,
  payload: UpdateRecipeIngredientPayload,
) {
  const { data } = await api.put(
    `/api/recipes/${recipeId}/ingredients/${ingredientRowId}`,
    payload,
  );
  return data;
}

export async function deleteRecipeIngredient(
  recipeId: number,
  ingredientRowId: number,
): Promise<void> {
  await api.delete(
    `/api/recipes/${recipeId}/ingredients/${ingredientRowId}`,
  );
}
