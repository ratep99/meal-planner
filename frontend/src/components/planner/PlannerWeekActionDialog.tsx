import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { WEEKDAY_LABELS_SHORT } from "@/lib/week-utils";
import { cn } from "@/lib/utils";
import type { PlannerProfileMode } from "@/components/planner/PlannerToolbar";
import type { UserProfile } from "@/types/profile";

export type WeekExportSelection = {
  profileMode: PlannerProfileMode;
  /** Length 7, index 0 = Monday; true = include this weekday. */
  weekdays: boolean[];
};

type PlannerWeekActionDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  profiles: UserProfile[];
  confirmLabel: string;
  pending?: boolean;
  onConfirm: (sel: WeekExportSelection) => void;
};

export function PlannerWeekActionDialog({
  open,
  onClose,
  title,
  description,
  profiles,
  confirmLabel,
  pending,
  onConfirm,
}: PlannerWeekActionDialogProps) {
  const p0 = profiles[0];
  const p1 = profiles[1];
  const two = profiles.length >= 2;

  const [profileMode, setProfileMode] = useState<PlannerProfileMode>("first");
  const [weekdays, setWeekdays] = useState(() => Array<boolean>(7).fill(true));

  useEffect(() => {
    if (open) {
      setWeekdays(Array<boolean>(7).fill(true));
      setProfileMode("first");
    }
  }, [open]);

  const toggleDay = (i: number) => {
    setWeekdays((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const anyDay = weekdays.some(Boolean);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!anyDay || pending}
            onClick={() =>
              onConfirm({ profileMode, weekdays: [...weekdays] })
            }
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary">{description}</p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Profile
        </p>
        {!two || !p0 || !p1 ? (
          <p className="text-sm text-text-secondary">
            {p0?.displayName ?? "Profile"}
          </p>
        ) : (
          <div
            className="inline-flex rounded-full border border-border bg-surface-muted p-1"
            role="tablist"
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
                onClick={() => setProfileMode(mode)}
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
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Days
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS_SHORT.map((label, i) => (
            <label
              key={label}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                weekdays[i]
                  ? "border-accent bg-accent-light/40 text-text-primary"
                  : "border-border bg-surface-muted text-text-secondary",
              )}
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={weekdays[i]}
                onChange={() => toggleDay(i)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
