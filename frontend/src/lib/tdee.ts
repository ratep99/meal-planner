import type { ActivityLevel, Gender } from "@/types/enums";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level];
}

/** Mifflin–St Jeor BMR (kcal/day). */
export function bmr(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "MALE" ? base + 5 : base - 161;
}

/** TDEE preview = BMR × activity (matches spec baseline; goal adjustments are backend-specific). */
export function previewTdee(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
): number {
  return bmr(gender, weightKg, heightCm, age) * activityMultiplier(activityLevel);
}

export function previewMacroGrams(
  tdee: number,
  weightKg: number,
  proteinMultiplier: number,
  fatMultiplier: number,
): { proteinG: number; fatG: number; carbsG: number } {
  const proteinG = proteinMultiplier * weightKg;
  const fatG = fatMultiplier * weightKg;
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, (tdee - proteinKcal - fatKcal) / 4);
  return { proteinG, fatG, carbsG };
}

export function previewMacroKcalFromGrams(
  proteinG: number,
  fatG: number,
  carbsG: number,
): { protein: number; fat: number; carbs: number; total: number } {
  const protein = proteinG * 4;
  const fat = fatG * 9;
  const carbs = carbsG * 4;
  return { protein, fat, carbs, total: protein + fat + carbs };
}
