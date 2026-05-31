import { sumMacros } from "@/lib/macros";
import type { MealType } from "@/types/enums";
import type { MealPlanDetail, MealPlanEntry } from "@/types/mealplan";
import type { Macros } from "@/types/recipe";

export function slotId(day: number, mealType: MealType, profileId: number) {
  return `slot:${day}:${mealType}:${profileId}`;
}

export function parseSlotId(id: string | undefined | null) {
  if (!id?.startsWith("slot:")) return null;
  const [, d, mt, pid] = id.split(":");
  return {
    day: Number(d),
    mealType: mt as MealType,
    profileId: Number(pid),
  };
}

export function parseRecipeDragId(id: string | undefined | null) {
  if (!id?.startsWith("recipe:")) return null;
  return Number(id.split(":")[1]);
}

export function parseEntryDragId(id: string | undefined | null) {
  if (!id?.startsWith("entry:")) return null;
  return Number(id.split(":")[1]);
}

export function findEntryById(
  plan: MealPlanDetail,
  entryId: number,
): MealPlanEntry | undefined {
  for (const d of plan.days) {
    const e = d.entries.find((x) => x.id === entryId);
    if (e) return e;
  }
  return undefined;
}

export function findDayNumberForEntry(
  plan: MealPlanDetail,
  entryId: number,
): number | undefined {
  for (const d of plan.days) {
    if (d.entries.some((x) => x.id === entryId)) return d.dayNumber;
  }
  return undefined;
}

export function deriveDayTotals(
  plan: MealPlanDetail,
  dayNumber: number,
  profileIds: number[],
): Macros | null {
  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;
  const entries = day.entries.filter((e) =>
    profileIds.includes(e.userProfileId),
  );
  return sumMacros(
    entries.map((e) => ({
      kcal: e.calculatedKcal,
      protein: e.calculatedProtein,
      carbs: e.calculatedCarbs,
      fat: e.calculatedFat,
    })),
  );
}

export function profileTargetsFromUser(
  calculatedKcal: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
): Macros {
  return {
    kcal: calculatedKcal,
    protein: targetProtein,
    carbs: targetCarbs,
    fat: targetFat,
  };
}

/** Green within 5%, amber within ±10%, red beyond (or over target for kcal). */
export function macroBand(
  actual: number,
  target: number,
  _kind: "kcal" | "g",
): "success" | "warning" | "danger" {
  if (target <= 0) return "success";
  const ratio = actual / target;
  if (ratio >= 0.95 && ratio <= 1.05) return "success";
  if (ratio >= 0.9 && ratio <= 1.1) return "warning";
  return "danger";
}
