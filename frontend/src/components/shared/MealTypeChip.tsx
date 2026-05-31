import type { MealType } from "@/types/enums";
import { cn } from "@/lib/utils";

const mealStyles: Record<
  MealType,
  { bg: string; text: string; label: string }
> = {
  BREAKFAST: {
    bg: "bg-breakfast/15",
    text: "text-[#b45309]",
    label: "Breakfast",
  },
  LUNCH: { bg: "bg-lunch/15", text: "text-lunch", label: "Lunch" },
  DINNER: { bg: "bg-dinner/15", text: "text-dinner", label: "Dinner" },
  SNACK: { bg: "bg-snack/20", text: "text-[#a16207]", label: "Snack" },
};

type MealTypeChipProps = {
  mealType: MealType;
  className?: string;
};

export function MealTypeChip({ mealType, className }: MealTypeChipProps) {
  const s = mealStyles[mealType];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.bg,
        s.text,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
