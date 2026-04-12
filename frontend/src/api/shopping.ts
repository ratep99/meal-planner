import { api } from "@/lib/api";
import type { IngredientCategory } from "@/types/enums";
import type {
  GenerateShoppingPayload,
  ShoppingCategoryGroup,
  ShoppingListDetail,
  ShoppingListItem,
  ShoppingListSummary,
} from "@/types/shopping";

export async function fetchShoppingLists(): Promise<ShoppingListSummary[]> {
  const { data } = await api.get<unknown>("/api/shopping");
  return normalizeList(data);
}

export async function fetchShoppingList(id: number): Promise<ShoppingListDetail> {
  const { data } = await api.get<unknown>(`/api/shopping/${id}`);
  return normalizeDetail(id, data);
}

export async function fetchShoppingListGrouped(
  id: number,
): Promise<ShoppingCategoryGroup[]> {
  const { data } = await api.get<unknown>(`/api/shopping/${id}/grouped`);
  return normalizeGrouped(data);
}

export async function generateShoppingList(
  payload: GenerateShoppingPayload,
): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>("/api/shopping", payload);
  return data;
}

export async function deleteShoppingList(id: number): Promise<void> {
  await api.delete(`/api/shopping/${id}`);
}

export function normalizeShoppingListItem(
  raw: Record<string, unknown>,
): ShoppingListItem | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const shoppingListId = Number(raw.shoppingListId);
  const ingredientId = Number(raw.ingredientId);
  const ingredientName =
    typeof raw.ingredientName === "string"
      ? raw.ingredientName
      : (raw.ingredient as { name?: string } | undefined)?.name ?? "Ingredient";

  const qtyMap =
    raw.quantityPerMealPlan != null
      ? normalizeQuantityPerMealPlan(raw.quantityPerMealPlan)
      : {};

  const totalQuantity =
    typeof raw.totalQuantity === "number"
      ? raw.totalQuantity
      : Number(raw.totalQuantity);

  const displayUnit =
    typeof raw.displayUnit === "string" ? raw.displayUnit : "g";

  const category = (raw.category as IngredientCategory) ?? "OTHER";

  return {
    id,
    shoppingListId: Number.isFinite(shoppingListId) ? shoppingListId : 0,
    ingredientId: Number.isFinite(ingredientId) ? ingredientId : 0,
    ingredientName,
    quantityPerMealPlan: qtyMap,
    totalQuantity: Number.isFinite(totalQuantity) ? totalQuantity : 0,
    displayUnit,
    category,
  };
}

function normalizeQuantityPerMealPlan(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const planId = Number(k);
    const qty = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(planId) && Number.isFinite(qty)) out[planId] = qty;
  }
  return out;
}

function normalizeList(raw: unknown): ShoppingListSummary[] {
  if (!Array.isArray(raw)) return [];
  const out: ShoppingListSummary[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      name: typeof o.name === "string" ? o.name : `List ${id}`,
      dateRangeStart:
        typeof o.dateRangeStart === "string" ? o.dateRangeStart : "",
      dateRangeEnd: typeof o.dateRangeEnd === "string" ? o.dateRangeEnd : "",
      mealPlanIds: normalizeMealPlanIds(o.mealPlanIds),
      itemCount:
        typeof o.itemCount === "number" ? o.itemCount : undefined,
      ingredientCount:
        typeof o.ingredientCount === "number"
          ? o.ingredientCount
          : undefined,
    });
  }
  return out;
}

function normalizeMealPlanIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function normalizeDetail(id: number, raw: unknown): ShoppingListDetail {
  if (!raw || typeof raw !== "object") {
    return {
      id,
      name: "",
      dateRangeStart: "",
      dateRangeEnd: "",
      mealPlanIds: [],
      items: [],
    };
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items;
  const items: ShoppingListItem[] = [];
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!row || typeof row !== "object") continue;
      const item = normalizeShoppingListItem(row as Record<string, unknown>);
      if (item) items.push(item);
    }
  }

  return {
    id: Number(o.id) || id,
    name: typeof o.name === "string" ? o.name : `Shopping list ${id}`,
    dateRangeStart:
      typeof o.dateRangeStart === "string" ? o.dateRangeStart : "",
    dateRangeEnd: typeof o.dateRangeEnd === "string" ? o.dateRangeEnd : "",
    mealPlanIds: normalizeMealPlanIds(o.mealPlanIds),
    itemCount: typeof o.itemCount === "number" ? o.itemCount : items.length,
    ingredientCount:
      typeof o.ingredientCount === "number"
        ? o.ingredientCount
        : items.length,
    items,
  };
}

function normalizeGrouped(raw: unknown): ShoppingCategoryGroup[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.groups)) {
    const out: ShoppingCategoryGroup[] = [];
    for (const g of o.groups) {
      if (!g || typeof g !== "object") continue;
      const gr = g as Record<string, unknown>;
      const cat = gr.category as IngredientCategory | undefined;
      const itemsRaw = gr.items;
      if (!cat || !Array.isArray(itemsRaw)) continue;
      const items: ShoppingListItem[] = [];
      for (const row of itemsRaw) {
        if (!row || typeof row !== "object") continue;
        const item = normalizeShoppingListItem(row as Record<string, unknown>);
        if (item) items.push(item);
      }
      out.push({ category: cat, items });
    }
    return out;
  }

  const categories: IngredientCategory[] = [
    "MEAT",
    "DAIRY",
    "GRAIN",
    "PRODUCE",
    "PANTRY",
    "OTHER",
  ];
  const out: ShoppingCategoryGroup[] = [];
  for (const cat of categories) {
    const arr = o[cat];
    if (!Array.isArray(arr)) continue;
    const items: ShoppingListItem[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const item = normalizeShoppingListItem(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    if (items.length) out.push({ category: cat, items });
  }
  return out;
}
