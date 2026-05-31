import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { MacroChips } from "@/components/shared/MacroChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateProfile,
  useProfile,
  useProfileTDEE,
  useProfileTdeePreview,
  useUpdateProfile,
} from "@/hooks/useProfiles";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ACTIVITY_LEVEL_INFO, GOAL_LABELS } from "@/lib/profile-constants";
import {
  ACTIVITY_LEVELS,
  GENDERS,
  GOALS,
  type ActivityLevel,
  type Gender,
} from "@/types/enums";
import type { ProfileTdeePreviewPayload } from "@/types/profile";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  age: z.coerce.number().int().min(1).max(120),
  heightCm: z.coerce.number().min(50).max(260),
  weightKg: z.coerce.number().min(20).max(400),
  activityLevel: z.enum([
    "SEDENTARY",
    "LIGHT",
    "MODERATE",
    "ACTIVE",
    "VERY_ACTIVE",
  ]),
  goal: z.enum(["CUT", "MAINTAIN", "BULK"]),
  proteinMultiplier: z.coerce.number().min(0.5).max(5),
  fatMultiplier: z.coerce.number().min(0.2).max(3),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

type ProfileFormProps =
  | { mode: "create" }
  | { mode: "edit"; profileId: number };

export default function ProfileForm(props: ProfileFormProps) {
  const navigate = useNavigate();
  const profileId = props.mode === "edit" ? props.profileId : undefined;

  const { data: existing, isLoading: loadingProfile } = useProfile(profileId);
  const { data: tdeeBreakdown } = useProfileTDEE(profileId);

  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      gender: "MALE",
      age: 30,
      heightCm: 175,
      weightKg: 75,
      activityLevel: "MODERATE",
      goal: "MAINTAIN",
      proteinMultiplier: 2,
      fatMultiplier: 0.8,
    },
  });

  const { control, handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (props.mode !== "edit" || !existing) return;
    reset({
      displayName: existing.displayName,
      gender: existing.gender,
      age: existing.age,
      heightCm: existing.heightCm,
      weightKg: existing.weightKg,
      activityLevel: existing.activityLevel,
      goal: existing.goal,
      proteinMultiplier: existing.proteinMultiplier ?? 2,
      fatMultiplier: existing.fatMultiplier ?? 0.8,
    });
  }, [existing, props.mode, reset]);

  const watched = useWatch({ control });

  const previewPayload = useMemo((): ProfileTdeePreviewPayload | null => {
    const gender = watched?.gender as Gender | undefined;
    const goal = watched?.goal;
    const activityLevel = watched?.activityLevel as ActivityLevel | undefined;
    if (!gender || !goal || !activityLevel) return null;

    const age = Number(watched?.age);
    const heightCm = Number(watched?.heightCm);
    const weightKg = Number(watched?.weightKg);
    const proteinMultiplier = Number(watched?.proteinMultiplier);
    const fatMultiplier = Number(watched?.fatMultiplier);

    if (
      !Number.isFinite(age) ||
      !Number.isFinite(heightCm) ||
      !Number.isFinite(weightKg) ||
      !Number.isFinite(proteinMultiplier) ||
      !Number.isFinite(fatMultiplier)
    ) {
      return null;
    }

    if (
      age < 1 ||
      age > 120 ||
      heightCm < 50 ||
      heightCm > 260 ||
      weightKg < 20 ||
      weightKg > 400 ||
      proteinMultiplier < 0.5 ||
      proteinMultiplier > 5 ||
      fatMultiplier < 0.2 ||
      fatMultiplier > 3
    ) {
      return null;
    }

    return {
      gender,
      age,
      heightCm,
      weightKg,
      activityLevel,
      goal,
      proteinMultiplier,
      fatMultiplier,
    };
  }, [
    watched?.gender,
    watched?.goal,
    watched?.activityLevel,
    watched?.age,
    watched?.heightCm,
    watched?.weightKg,
    watched?.proteinMultiplier,
    watched?.fatMultiplier,
  ]);

  const debouncedPreviewPayload = useDebouncedValue(previewPayload, 300);
  const effectivePreviewPayload =
    previewPayload === null ? null : debouncedPreviewPayload;

  const {
    data: tdeePreview,
    isFetching: previewFetching,
    isError: previewError,
  } = useProfileTdeePreview(effectivePreviewPayload);

  const summaryMacros = useMemo(() => {
    if (
      effectivePreviewPayload != null &&
      tdeePreview != null &&
      !previewError
    ) {
      return {
        kcal: Math.round(tdeePreview.calculatedKcal),
        protein: tdeePreview.targetProtein,
        carbs: tdeePreview.targetCarbs,
        fat: tdeePreview.targetFat,
      };
    }
    if (existing) {
      return {
        kcal: existing.calculatedKcal,
        protein: existing.targetProtein,
        carbs: existing.targetCarbs,
        fat: existing.targetFat,
      };
    }
    return {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }, [effectivePreviewPayload, tdeePreview, previewError, existing]);

  const onSubmit = async (values: ProfileFormValues) => {
    const payload = {
      displayName: values.displayName,
      gender: values.gender,
      age: values.age,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      activityLevel: values.activityLevel,
      goal: values.goal,
      proteinMultiplier: values.proteinMultiplier,
      fatMultiplier: values.fatMultiplier,
    };

    try {
      if (props.mode === "create") {
        const created = await createProfile.mutateAsync(payload);
        toast.success(
          `Profile created — target: ${created.calculatedKcal} kcal / day`,
        );
        navigate(`/profiles/${created.id}/edit`);
        return;
      }

      const previousKcal = existing?.calculatedKcal;
      const updated = await updateProfile.mutateAsync({
        id: props.profileId,
        payload,
      });
      toast.success(
        `Your new target: ${updated.calculatedKcal} kcal, was ${previousKcal ?? "—"} kcal`,
      );
    } catch {
      /* hooks toast on error */
    }
  };

  if (props.mode === "edit" && loadingProfile) {
    return (
      <p className="text-text-secondary" role="status">
        Loading profile…
      </p>
    );
  }

  if (props.mode === "edit" && !existing) {
    return (
      <p className="text-destructive" role="alert">
        Profile not found.
      </p>
    );
  }

  const backHref = "/profiles";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          to={backHref}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-text-secondary",
            "hover:bg-surface-muted hover:text-text-primary",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="font-display text-3xl text-text-primary">
          {props.mode === "create" ? "New profile" : "Edit profile"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-8"
      >
        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">Basics</h2>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" {...form.register("displayName")} />
            {formState.errors.displayName && (
              <p className="text-sm text-destructive">
                {formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => field.onChange(g)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        field.value === g
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface-muted text-text-secondary hover:border-accent/50",
                      )}
                    >
                      {GENDER_LABEL[g]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={1}
                {...form.register("age")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min={1}
                {...form.register("heightCm")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.1"
                min={1}
                {...form.register("weightKg")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">
            Activity level
          </h2>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field }) => (
              <div className="space-y-3">
                {ACTIVITY_LEVELS.map((level) => {
                  const info = ACTIVITY_LEVEL_INFO[level];
                  const selected = field.value === level;
                  return (
                    <label
                      key={level}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                        selected
                          ? "border-accent bg-accent-light/40"
                          : "border-border hover:border-accent/40",
                      )}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        checked={selected}
                        onChange={() => field.onChange(level)}
                      />
                      <span>
                        <span className="font-medium text-text-primary">
                          {info.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-text-secondary">
                          {info.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">Goal</h2>
          <Controller
            control={control}
            name="goal"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => field.onChange(g)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      field.value === g
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border bg-surface-muted text-text-secondary hover:border-accent/50",
                    )}
                  >
                    {GOAL_LABELS[g]}
                  </button>
                ))}
              </div>
            )}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">
            Macro multipliers
          </h2>
          <p className="text-sm text-text-secondary">
            Protein and fat are set per kg bodyweight. Carbs fill the remaining
            calories from your goal-adjusted daily target (server preview).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proteinMultiplier">
                Protein (g per kg bodyweight)
              </Label>
              <Input
                id="proteinMultiplier"
                type="number"
                step={0.1}
                min={0.5}
                {...form.register("proteinMultiplier")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatMultiplier">Fat (g per kg bodyweight)</Label>
              <Input
                id="fatMultiplier"
                type="number"
                step={0.1}
                min={0.2}
                {...form.register("fatMultiplier")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbsPreview">Carbs (calculated)</Label>
            <Input
              id="carbsPreview"
              readOnly
              value={
                effectivePreviewPayload != null &&
                tdeePreview != null &&
                !previewError
                  ? `${tdeePreview.targetCarbs.toFixed(1)} g`
                  : "—"
              }
              className="bg-surface-muted text-text-secondary"
            />
          </div>
        </section>

        {props.mode === "edit" && tdeeBreakdown && (
          <section className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">
              Energy breakdown (saved profile)
            </p>
            <ul className="mt-2 space-y-1">
              <li>BMR: {Math.round(tdeeBreakdown.bmr)} kcal</li>
              <li>Activity × {tdeeBreakdown.activityMultiplier}</li>
              <li>Maintenance TDEE: {Math.round(tdeeBreakdown.tdee)} kcal</li>
              <li>
                Daily target (after goal):{" "}
                {Math.round(tdeeBreakdown.calculatedKcal)} kcal
              </li>
              <li>Goal multiplier ×{tdeeBreakdown.goalCalorieMultiplier}</li>
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-surface-muted p-6 shadow-card">
          <h2 className="mb-3 font-display text-lg text-text-primary">
            Calculated macro summary (preview)
          </h2>
          {previewError && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              Could not load preview. Check the API or your inputs.
            </p>
          )}
          {tdeePreview != null && !previewError && (
            <div className="mb-3 space-y-1 text-sm text-text-secondary">
              <p>
                Daily target (after goal):{" "}
                <span className="font-medium text-text-primary">
                  {Math.round(tdeePreview.calculatedKcal)} kcal
                </span>
                {previewFetching ? (
                  <span className="ml-2 text-text-secondary">Updating…</span>
                ) : null}
              </p>
              <p>
                Maintenance ~{" "}
                <span className="font-medium text-text-primary">
                  {Math.round(tdeePreview.tdee)} kcal
                </span>
              </p>
            </div>
          )}
          <MacroChips macros={summaryMacros} size="md" />
        </section>

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={
              createProfile.isPending ||
              updateProfile.isPending
            }
          >
            Save profile
          </Button>
          <Link
            to={backHref}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary",
              "hover:bg-surface-muted",
            )}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
