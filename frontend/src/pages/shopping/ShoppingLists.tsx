import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GenerateShoppingModal } from "@/components/shopping/GenerateShoppingModal";
import { Button } from "@/components/ui/button";
import {
  useDeleteShoppingList,
  useGenerateShoppingList,
  useShoppingLists,
} from "@/hooks/useShoppingList";
import { useMealPlans } from "@/hooks/useMealPlan";
import { cn } from "@/lib/utils";

export default function ShoppingLists() {
  const navigate = useNavigate();
  const { data: lists, isLoading, isError } = useShoppingLists();
  const { data: mealPlans = [] } = useMealPlans();
  const generate = useGenerateShoppingList();
  const remove = useDeleteShoppingList();
  const [modalOpen, setModalOpen] = useState(false);

  const handleGenerate = async (payload: {
    mealPlanIds: number[];
    dateRangeStart: string;
    dateRangeEnd: string;
    name?: string;
  }) => {
    try {
      const res = await generate.mutateAsync(payload);
      toast.success("Shopping list created");
      setModalOpen(false);
      navigate(`/shopping/${res.id}`);
    } catch {
      toast.error("Could not generate shopping list");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Shopping lists
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Aggregate ingredients from one or more meal plans.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Generate new</Button>
      </div>

      <GenerateShoppingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mealPlans={mealPlans}
        onSubmit={handleGenerate}
        pending={generate.isPending}
      />

      {isLoading && (
        <p className="text-text-secondary" role="status">
          Loading lists…
        </p>
      )}
      {isError && (
        <p className="text-destructive" role="alert">
          Could not load shopping lists.
        </p>
      )}

      {!isLoading && !isError && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(lists ?? []).map((list) => (
            <li key={list.id}>
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-lg border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-hover",
                )}
              >
                <Link
                  to={`/shopping/${list.id}`}
                  className="block flex-1 after:absolute after:inset-0 after:rounded-lg after:content-['']"
                  aria-label={`Open ${list.name}`}
                />
                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      {list.name}
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      {list.dateRangeStart} → {list.dateRangeEnd}
                    </p>
                    <p className="mt-2 text-xs text-text-muted">
                      {list.mealPlanIds.length} meal plan
                      {list.mealPlanIds.length === 1 ? "" : "s"} ·{" "}
                      {list.ingredientCount ?? list.itemCount ?? "—"} ingredients
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="relative z-20 h-9 min-h-9 shrink-0 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${list.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void remove.mutateAsync(list.id).then(() => {
                        toast.success("List deleted");
                      });
                    }}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && lists?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted/40 px-6 py-12 text-center">
          <p className="text-text-secondary">No shopping lists yet.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            Generate your first list
          </Button>
        </div>
      )}
    </div>
  );
}
