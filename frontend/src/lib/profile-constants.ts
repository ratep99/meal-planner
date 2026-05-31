import type { ActivityLevel, Goal } from "@/types/enums";

export const ACTIVITY_LEVEL_INFO: Record<
  ActivityLevel,
  { label: string; description: string }
> = {
  SEDENTARY: {
    label: "Sedentary",
    description: "Little or no exercise, desk job",
  },
  LIGHT: {
    label: "Light",
    description: "Light exercise 1–3 days per week",
  },
  MODERATE: {
    label: "Moderate",
    description: "Moderate exercise 3–5 days per week",
  },
  ACTIVE: {
    label: "Active",
    description: "Hard exercise 6–7 days per week",
  },
  VERY_ACTIVE: {
    label: "Very active",
    description: "Very hard exercise, physical job, or training twice daily",
  },
};

export const GOAL_LABELS: Record<Goal, string> = {
  CUT: "Cut",
  MAINTAIN: "Maintain",
  BULK: "Bulk",
};
