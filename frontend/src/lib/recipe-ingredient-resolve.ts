import type { Ingredient } from "@/types/ingredient";
import type { RecipeIngredient } from "@/types/recipe";

export function ingredientCatalogMap(
  list: Ingredient[] | undefined,
): Map<number, Ingredient> {
  return new Map((list ?? []).map((i) => [i.id, i]));
}

function displayNameForLine(
  ri: RecipeIngredient,
  fromCatalog: Ingredient | undefined,
  nested: Ingredient | undefined,
): string {
  return (
    nested?.name?.trim() ||
    ri.ingredientName?.trim() ||
    fromCatalog?.name?.trim() ||
    ""
  );
}

/**
 * Merges nested `ingredient` from GET /recipes/{id} with the ingredient catalog.
 * The API often omits per-100g fields on nested DTOs (zeros); the catalog has full nutrition.
 */
export function resolveRecipeLineIngredient(
  ri: RecipeIngredient,
  catalog: Map<number, Ingredient>,
): Ingredient | undefined {
  const id = ri.ingredientId;
  if (!id) return ri.ingredient;

  const fromCatalog = catalog.get(id);
  const nested = ri.ingredient;

  if (!fromCatalog && !nested) return undefined;
  if (!fromCatalog) return nested;
  if (!nested) return fromCatalog;

  const nestedMacroSum =
    nested.kcalPer100g +
    nested.proteinPer100g +
    nested.carbsPer100g +
    nested.fatPer100g;
  const catMacroSum =
    fromCatalog.kcalPer100g +
    fromCatalog.proteinPer100g +
    fromCatalog.carbsPer100g +
    fromCatalog.fatPer100g;

  const preferCatalogMacros = nestedMacroSum === 0 && catMacroSum > 0;
  const name = displayNameForLine(ri, fromCatalog, nested);

  if (preferCatalogMacros) {
    return {
      ...fromCatalog,
      ...nested,
      id: fromCatalog.id,
      name: name || fromCatalog.name,
      kcalPer100g: fromCatalog.kcalPer100g,
      proteinPer100g: fromCatalog.proteinPer100g,
      carbsPer100g: fromCatalog.carbsPer100g,
      fatPer100g: fromCatalog.fatPer100g,
      fiberPer100g: fromCatalog.fiberPer100g,
      unitType: nested.unitType ?? fromCatalog.unitType,
      pieceWeightGrams: nested.pieceWeightGrams ?? fromCatalog.pieceWeightGrams,
      openFoodFactsId: nested.openFoodFactsId ?? fromCatalog.openFoodFactsId,
      source: nested.source ?? fromCatalog.source,
      category: nested.category ?? fromCatalog.category,
      createdAt: nested.createdAt || fromCatalog.createdAt,
      manualOverride: nested.manualOverride ?? fromCatalog.manualOverride,
    };
  }

  return {
    ...fromCatalog,
    ...nested,
    id: fromCatalog.id,
    name: name || nested.name || fromCatalog.name,
    kcalPer100g: nested.kcalPer100g ?? fromCatalog.kcalPer100g,
    proteinPer100g: nested.proteinPer100g ?? fromCatalog.proteinPer100g,
    carbsPer100g: nested.carbsPer100g ?? fromCatalog.carbsPer100g,
    fatPer100g: nested.fatPer100g ?? fromCatalog.fatPer100g,
    fiberPer100g: nested.fiberPer100g ?? fromCatalog.fiberPer100g,
    unitType: nested.unitType ?? fromCatalog.unitType,
    pieceWeightGrams: nested.pieceWeightGrams ?? fromCatalog.pieceWeightGrams,
  };
}

export function resolveFormRowIngredient(
  row: {
    ingredientId: number;
    name: string;
    ingredient?: Ingredient;
  },
  catalog: Map<number, Ingredient>,
): Ingredient | undefined {
  return resolveRecipeLineIngredient(
    {
      id: 0,
      recipeId: 0,
      ingredientId: row.ingredientId,
      quantity: 0,
      unit: "GRAMS",
      optional: false,
      ingredient: row.ingredient,
      ingredientName: row.name?.trim() ? row.name : null,
    },
    catalog,
  );
}
