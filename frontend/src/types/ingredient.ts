import type {
  IngredientCategory,
  IngredientSource,
  UnitType,
} from "@/types/enums";

export type Ingredient = {
  id: number;
  name: string;
  openFoodFactsId: string | null;
  source: IngredientSource;
  unitType: UnitType;
  pieceWeightGrams: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  category: IngredientCategory;
  createdAt: string;
  manualOverride: boolean;
};

export type CreateIngredientPayload = {
  name: string;
  category: IngredientCategory;
  unitType: UnitType;
  pieceWeightGrams?: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  source?: IngredientSource;
  openFoodFactsId?: string | null;
  manualOverride?: boolean;
};

export type UpdateIngredientPayload = Partial<CreateIngredientPayload>;
