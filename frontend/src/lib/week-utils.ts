import { parsePlanStart, startOfLocalDay } from "@/lib/dashboard-plan";

export const WEEKDAY_LABELS_SHORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** Monday 00:00 local of the calendar week containing `from`. */
export function startOfWeekMonday(from: Date = new Date()): Date {
  const d = startOfLocalDay(from);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDateLocal(d: Date): string {
  const x = startOfLocalDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Map a calendar date to 1-based plan day index, or null if outside the plan window.
 */
export function getPlanDayNumber(
  planStartIso: string,
  planDaysCount: number,
  cellDate: Date,
): number | null {
  const start = parsePlanStart(planStartIso);
  const cell = startOfLocalDay(cellDate);
  const diffMs = cell.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0 || diffDays >= planDaysCount) return null;
  return diffDays + 1;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum `daysCount` so each Mon–Sun column (relative to `weekMonday`) maps to a plan day.
 * If `planStartIso` is after any day in that week, returns `{ blocked: true }` (needs a
 * `startDate` change on the server, not just a longer window).
 */
export function minDaysCountForVisibleWeek(
  planStartIso: string,
  weekMonday: Date,
  options?: { maxDays?: number },
):
  | { daysCount: number }
  | { blocked: true } {
  const maxDays = options?.maxDays ?? 14;
  const planStart = parsePlanStart(planStartIso);
  let required = 0;
  for (let i = 0; i < 7; i++) {
    const cell = startOfLocalDay(addDays(weekMonday, i));
    const diffDays = Math.round(
      (cell.getTime() - planStart.getTime()) / DAY_MS,
    );
    if (diffDays < 0) return { blocked: true };
    required = Math.max(required, diffDays + 1);
  }
  return { daysCount: Math.min(required, maxDays) };
}

export function formatWeekdayRowLabel(mondayWeek: Date, columnIndex: number): string {
  const d = addDays(mondayWeek, columnIndex);
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${WEEKDAY_LABELS_SHORT[columnIndex]} ${mon}/${day}`;
}
