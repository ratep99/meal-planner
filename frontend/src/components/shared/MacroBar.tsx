import type { Macros } from "@/types/recipe";
import { formatMacroValue } from "@/lib/macros";
import { cn } from "@/lib/utils";

type MacroBarProps = {
  actual: Macros;
  target: Macros;
  compact?: boolean;
  className?: string;
};

function pct(value: number, target: number): number {
  if (target <= 0 || !Number.isFinite(target)) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, (value / target) * 100);
}

const rows: {
  key: keyof Macros;
  label: string;
  color: string;
  kind: "g" | "kcal";
}[] = [
  { key: "protein", label: "Protein", color: "bg-macro-protein", kind: "g" },
  { key: "carbs", label: "Carbs", color: "bg-macro-carbs", kind: "g" },
  { key: "fat", label: "Fat", color: "bg-macro-fat", kind: "g" },
  { key: "kcal", label: "Kcal", color: "bg-macro-kcal", kind: "kcal" },
];

export function MacroBar({
  actual,
  target,
  compact,
  className,
}: MacroBarProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 shadow-card",
        compact && "p-3",
        className,
      )}
    >
      <div className="space-y-3">
        {rows.map(({ key, label, color, kind }) => {
          const a = actual[key];
          const t = target[key];
          const width = pct(a, t);
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs text-text-secondary">
                <span>{label}</span>
                <span className="tabular-nums text-text-primary">
                  {kind === "g"
                    ? `${formatMacroValue(a, kind)}g / ${formatMacroValue(t, kind)}g`
                    : `${formatMacroValue(a, kind)} / ${formatMacroValue(t, kind)} kcal`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-all", color)}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
