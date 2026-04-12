import type { ProfileTdeePreviewPayload } from "@/types/profile";

export const profileKeys = {
  all: ["profiles"] as const,
  list: () => [...profileKeys.all, "list"] as const,
  detail: (id: number) => [...profileKeys.all, "detail", id] as const,
  tdee: (id: number) => [...profileKeys.all, "detail", id, "tdee"] as const,
  tdeePreview: (p: ProfileTdeePreviewPayload) =>
    [
      ...profileKeys.all,
      "tdee-preview",
      p.gender,
      p.age,
      p.heightCm,
      p.weightKg,
      p.activityLevel,
      p.goal,
      p.proteinMultiplier,
      p.fatMultiplier,
    ] as const,
};
