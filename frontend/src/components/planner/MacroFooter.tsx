import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { macroBand } from "@/lib/planner";
import type { Macros } from "@/types/recipe";
import { cn } from "@/lib/utils";

type MacroFooterProps = {
  selectedDay: number;
  totalDays: number;
  /** e.g. "Wed 04/09" when using calendar week rows */
  daySummaryLabel?: string;
  onDayChange: (day: number) => void;
  totals: Macros;
  targets: Macros;
};

function MacroCell({
  label,
  actual,
  target,
  kind,
}: {
  label: string;
  actual: number;
  target: number;
  kind: "kcal" | "g";
}) {
  const band = macroBand(actual, target, kind);
  const color =
    band === "success"
      ? "text-success"
      : band === "warning"
        ? "text-warning"
        : "text-destructive";

  const fmt =
    kind === "kcal"
      ? `${Math.round(actual)} / ${Math.round(target)}`
      : `${actual.toFixed(0)}g / ${target.toFixed(0)}g`;

  return (
    <div className="flex min-w-[10rem] flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className={cn("font-medium tabular-nums", color)}>{fmt}</span>
    </div>
  );
}

export function MacroFooter({
  selectedDay,
  totalDays,
  daySummaryLabel,
  onDayChange,
  totals,
  targets,
}: MacroFooterProps) {
  return (
    <div
      className="sticky bottom-0 z-30 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      role="region"
      aria-label="Day macro totals"
    >
      <div className="mx-auto flex max-w-content flex-col gap-3 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">Day</span>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-1">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2"
              aria-label="Previous day"
              onClick={() =>
                onDayChange(Math.max(1, selectedDay - 1))
              }
              disabled={selectedDay <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[5.5rem] text-center text-sm tabular-nums">
              {daySummaryLabel ?? `${selectedDay} / ${totalDays}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2"
              aria-label="Next day"
              onClick={() =>
                onDayChange(Math.min(totalDays, selectedDay + 1))
              }
              disabled={selectedDay >= totalDays}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-4 sm:justify-end">
          <MacroCell
            label="Kcal"
            actual={totals.kcal}
            target={targets.kcal}
            kind="kcal"
          />
          <MacroCell
            label="Protein"
            actual={totals.protein}
            target={targets.protein}
            kind="g"
          />
          <MacroCell
            label="Carbs"
            actual={totals.carbs}
            target={targets.carbs}
            kind="g"
          />
          <MacroCell
            label="Fat"
            actual={totals.fat}
            target={targets.fat}
            kind="g"
          />
        </div>
      </div>
    </div>
  );
}
