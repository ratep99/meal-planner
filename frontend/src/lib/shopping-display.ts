import type { IngredientCategory } from "@/types/enums";
import type {
  ShoppingCategoryGroup,
  ShoppingListItem,
} from "@/types/shopping";

export const CATEGORY_ORDER: IngredientCategory[] = [
  "MEAT",
  "DAIRY",
  "GRAIN",
  "PRODUCE",
  "PANTRY",
  "OTHER",
];

export const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  MEAT: "Meat",
  DAIRY: "Dairy",
  GRAIN: "Grains",
  PRODUCE: "Produce",
  PANTRY: "Pantry",
  OTHER: "Other",
};

export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  MEAT: "🥩",
  DAIRY: "🥛",
  GRAIN: "🌾",
  PRODUCE: "🥦",
  PANTRY: "🫙",
  OTHER: "📦",
};

export function deriveGroupedFromItems(
  items: ShoppingListItem[],
): ShoppingCategoryGroup[] {
  const map = new Map<IngredientCategory, ShoppingListItem[]>();
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const item of items) {
    const list = map.get(item.category) ?? map.get("OTHER")!;
    list.push(item);
  }
  const out: ShoppingCategoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const list = map.get(cat);
    if (list?.length) out.push({ category: cat, items: list });
  }
  return out;
}

export function formatQtyForPlan(
  qty: number | undefined,
  displayUnit: string,
): string {
  if (qty == null || !Number.isFinite(qty)) return "—";
  if (displayUnit === "pcs" || displayUnit === "kom" || displayUnit === "pc") {
    return `${Math.round(qty)} pcs`;
  }
  if (qty >= 1000 && (displayUnit === "g" || displayUnit === "gram")) {
    return `${(qty / 1000).toFixed(1)} kg`;
  }
  return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${displayUnit}`;
}
