import type { Macros } from "@/types/recipe";
import { formatMacroValue } from "@/lib/macros";
import { cn } from "@/lib/utils";

type MacroChipsProps = {
  macros: Macros;
  size?: "sm" | "md";
  className?: string;
};

export function MacroChips({ macros, size = "md", className }: MacroChipsProps) {
  const text =
    size === "sm" ? "text-xs text-text-secondary" : "text-sm text-text-secondary";
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className={cn(text, "font-medium text-macro-protein")}>
        P: {formatMacroValue(macros.protein, "g")}g
      </span>
      <span className={cn(text, "font-medium text-macro-carbs")}>
        C: {formatMacroValue(macros.carbs, "g")}g
      </span>
      <span className={cn(text, "font-medium text-macro-fat")}>
        F: {formatMacroValue(macros.fat, "g")}g
      </span>
      <span className={cn(text, "font-medium text-macro-kcal")}>
        {formatMacroValue(macros.kcal, "kcal")} kcal
      </span>
    </div>
  );
}
