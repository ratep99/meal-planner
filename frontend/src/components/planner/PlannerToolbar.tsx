import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/profile";
import { useEffect, useState } from "react";

export type PlannerProfileMode = "first" | "second" | "both";

type PlannerToolbarProps = {
  name: string;
  onNameCommit: (name: string) => void;
  profiles: UserProfile[];
  profileMode: PlannerProfileMode;
  onProfileModeChange: (mode: PlannerProfileMode) => void;
  onOpenShoppingDialog: () => void;
  onOpenPdfDialog: () => void;
  shoppingPending?: boolean;
};

export function PlannerToolbar({
  name,
  onNameCommit,
  profiles,
  profileMode,
  onProfileModeChange,
  onOpenShoppingDialog,
  onOpenPdfDialog,
  shoppingPending,
}: PlannerToolbarProps) {
  const [draftName, setDraftName] = useState(name);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const p0 = profiles[0];
  const p1 = profiles[1];
  const twoProfiles = profiles.length >= 2;

  return (
    <div className="mb-4 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => {
            if (draftName.trim() && draftName !== name) {
              onNameCommit(draftName.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="max-w-md font-display text-lg font-semibold"
          aria-label="Meal plan name"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-secondary">
          Week view: Mon–Sun (calendar week)
        </p>

        {twoProfiles && p0 && p1 && (
          <div
            className="inline-flex rounded-full border border-border bg-surface-muted p-1"
            role="tablist"
            aria-label="Planner profile view"
          >
            {(
              [
                ["first", p0.displayName],
                ["second", p1.displayName],
                ["both", "Both"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={profileMode === mode}
                onClick={() => onProfileModeChange(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  profileMode === mode
                    ? "bg-surface text-accent shadow-card"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <Button
          type="button"
          onClick={onOpenShoppingDialog}
          disabled={shoppingPending}
        >
          Generate Shopping List
        </Button>

        <Button type="button" variant="outline" onClick={onOpenPdfDialog}>
          Export PDF
        </Button>
      </div>
    </div>
  );
}
