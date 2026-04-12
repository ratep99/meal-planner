import type { ActivityLevel, Gender, Goal } from "@/types/enums";

export type UserProfile = {
  id: number;
  userId: number;
  displayName: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  calculatedKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  /** g protein per kg bodyweight — default 2.0 */
  proteinMultiplier: number;
  /** g fat per kg bodyweight — default 0.8 */
  fatMultiplier: number;
  createdAt?: string;
  updatedAt?: string;
};

/** GET /api/profiles/{id}/tdee and POST /api/profiles/tdee-preview (same shape). */
export type ProfileTdeeResponse = {
  bmr: number;
  /** Maintenance TDEE (pre-goal). */
  tdee: number;
  activityMultiplier: number;
  /** Daily calorie target after goal adjustment. */
  calculatedKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goal: Goal;
  goalCalorieMultiplier: number;
  profileId?: number | null;
  displayName?: string | null;
};

/** @deprecated Use ProfileTdeeResponse — kept for gradual migration. */
export type ProfileTdeeBreakdown = ProfileTdeeResponse;

/** Body for POST /api/profiles/tdee-preview (no displayName). */
export type ProfileTdeePreviewPayload = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  proteinMultiplier: number;
  fatMultiplier: number;
};

export type CreateProfilePayload = {
  displayName: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  proteinMultiplier?: number;
  fatMultiplier?: number;
};

export type UpdateProfilePayload = Partial<CreateProfilePayload>;
