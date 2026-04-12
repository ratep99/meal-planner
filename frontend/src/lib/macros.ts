import type { QuantityUnit } from "@/types/enums";
import type { Ingredient } from "@/types/ingredient";
import type { Macros } from "@/types/recipe";

/** Coerce API/mac math output to finite numbers (avoids NaN in UI). */
export function sanitizeMacros(m: Partial<Macros> | null | undefined): Macros {
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  return {
    kcal: n(m?.kcal),
    protein: n(m?.protein),
    carbs: n(m?.carbs),
    fat: n(m?.fat),
  };
}

export function effectiveGrams(
  ingredient: Pick<
    Ingredient,
    "unitType" | "pieceWeightGrams"
  >,
  quantity: number,
  unit: QuantityUnit,
): number {
  if (unit === "GRAMS") return quantity;
  const piece = ingredient.pieceWeightGrams ?? 0;
  return quantity * piece;
}

export function macroFromPer100g(
  macroPer100g: number,
  grams: number,
): number {
  const m = Number(macroPer100g);
  const g = Number(grams);
  if (!Number.isFinite(m) || !Number.isFinite(g)) return 0;
  return (m / 100) * g;
}

export function ingredientMacros(
  ingredient: Ingredient,
  quantity: number,
  unit: QuantityUnit,
): Macros {
  const grams = effectiveGrams(ingredient, quantity, unit);
  return {
    kcal: macroFromPer100g(ingredient.kcalPer100g, grams),
    protein: macroFromPer100g(ingredient.proteinPer100g, grams),
    carbs: macroFromPer100g(ingredient.carbsPer100g, grams),
    fat: macroFromPer100g(ingredient.fatPer100g, grams),
  };
}

export function sumMacros(rows: Macros[]): Macros {
  return rows.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function formatMacroValue(value: number, kind: "kcal" | "g"): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return kind === "kcal" ? "0" : "0";
  if (kind === "kcal") return `${Math.round(n)}`;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}
