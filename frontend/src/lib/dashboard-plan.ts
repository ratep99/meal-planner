import type { MealPlan } from "@/types/mealplan";

/** Start of calendar day in local timezone. */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parsePlanStart(isoDate: string): Date {
  const [y, m, day] = isoDate.split("-").map(Number);
  return startOfLocalDay(new Date(y, (m ?? 1) - 1, day ?? 1));
}

/** If today falls within the plan window, return 1-based day number. */
export function findTodayDayNumber(plan: MealPlan, now = new Date()): number | null {
  const start = parsePlanStart(plan.startDate);
  const today = startOfLocalDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + plan.daysCount - 1);
  if (today < start || today > end) return null;
  const diffDays = Math.round(
    (today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays + 1;
}
