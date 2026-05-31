export const MEAL_TYPES = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const QUANTITY_UNITS = ["GRAMS", "PIECES"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const INGREDIENT_SOURCES = ["OPEN_FOOD_FACTS", "MANUAL"] as const;
export type IngredientSource = (typeof INGREDIENT_SOURCES)[number];

export const UNIT_TYPES = ["WEIGHT", "PIECE"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const INGREDIENT_CATEGORIES = [
  "PRODUCE",
  "DAIRY",
  "MEAT",
  "GRAIN",
  "PANTRY",
  "OTHER",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const ACTIVITY_LEVELS = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOALS = ["CUT", "MAINTAIN", "BULK"] as const;
export type Goal = (typeof GOALS)[number];
