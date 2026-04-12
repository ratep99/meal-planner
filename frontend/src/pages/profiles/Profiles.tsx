import { Link } from "react-router-dom";
import { MacroChips } from "@/components/shared/MacroChips";
import { buttonVariants } from "@/components/ui/button";
import { useProfiles } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";

export default function Profiles() {
  const { data: profiles, isLoading, isError, error } = useProfiles();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-text-primary">Profiles</h1>
        <Link to="/profiles/new" className={buttonVariants()}>
          + New Profile
        </Link>
      </div>

      {isLoading && (
        <p className="text-text-secondary" role="status">
          Loading profiles…
        </p>
      )}
      {isError && (
        <p className="text-destructive" role="alert">
          {(error as Error)?.message ?? "Could not load profiles"}
        </p>
      )}

      {!isLoading && !isError && profiles?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
          <p className="text-text-secondary">No profiles yet.</p>
          <Link
            to="/profiles/new"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
          >
            Create your first profile
          </Link>
        </div>
      )}

      {!isLoading && profiles && profiles.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card"
            >
              <h2 className="font-display text-xl text-text-primary">
                {p.displayName}
              </h2>
              <dl className="mt-3 space-y-1 text-sm text-text-secondary">
                <div className="flex justify-between gap-2">
                  <dt>Age</dt>
                  <dd className="tabular-nums text-text-primary">{p.age}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Height</dt>
                  <dd className="tabular-nums text-text-primary">
                    {p.heightCm} cm
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Weight</dt>
                  <dd className="tabular-nums text-text-primary">
                    {p.weightKg} kg
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>TDEE</dt>
                  <dd className="tabular-nums font-medium text-accent">
                    {p.calculatedKcal} kcal
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Daily targets
                </p>
                <MacroChips
                  macros={{
                    kcal: p.calculatedKcal,
                    protein: p.targetProtein,
                    carbs: p.targetCarbs,
                    fat: p.targetFat,
                  }}
                  size="sm"
                />
              </div>
              <div className="mt-6">
                <Link
                  to={`/profiles/${p.id}/edit`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
