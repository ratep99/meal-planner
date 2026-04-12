import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MealPlan } from "@/types/mealplan";

type Props = {
  open: boolean;
  onClose: () => void;
  mealPlans: MealPlan[];
  onSubmit: (payload: {
    mealPlanIds: number[];
    dateRangeStart: string;
    dateRangeEnd: string;
    name?: string;
  }) => void;
  pending?: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function GenerateShoppingModal({
  open,
  onClose,
  mealPlans,
  onSubmit,
  pending,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [start, setStart] = useState(todayIso);
  const [end, setEnd] = useState(addDaysIso(7));
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setStart(todayIso());
    setEnd(addDaysIso(7));
    setName("");
    setSelected(new Set(mealPlans.length ? [mealPlans[0].id] : []));
  }, [open, mealPlans]);

  const canSubmit = useMemo(
    () => selected.size > 0 && start <= end,
    [selected, start, end],
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      mealPlanIds: [...selected],
      dateRangeStart: start,
      dateRangeEnd: end,
      name: name.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Generate shopping list">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Choose one or more meal plans and the date range to aggregate
          ingredients.
        </p>

        <div className="space-y-2">
          <Label>Meal plans</Label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-surface-muted/50 p-3">
            {mealPlans.length === 0 ? (
              <p className="text-sm text-text-muted">No meal plans yet.</p>
            ) : (
              mealPlans.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    selected.has(p.id)
                      ? "bg-accent-light text-accent"
                      : "hover:bg-surface-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-text-muted">
                    {p.daysCount}d · {p.startDate}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="range-start">From</Label>
            <Input
              id="range-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-end">To</Label>
            <Input
              id="range-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="list-name">Name (optional)</Label>
          <Input
            id="list-name"
            placeholder="e.g. Week of Apr 7"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
          >
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
