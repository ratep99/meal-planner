import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  deriveGroupedFromItems,
  formatQtyForPlan,
} from "@/lib/shopping-display";
import { resolveApiUrl } from "@/lib/api";
import { useMealPlans } from "@/hooks/useMealPlan";
import {
  useShoppingList,
  useShoppingListGrouped,
} from "@/hooks/useShoppingList";
import type { ShoppingCategoryGroup, ShoppingListItem } from "@/types/shopping";

const STORAGE_PREFIX = "shopping-checked-v1";

function loadChecked(listId: string): Set<number> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${listId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
  } catch {
    return new Set();
  }
}

function saveChecked(listId: string, set: Set<number>) {
  localStorage.setItem(
    `${STORAGE_PREFIX}:${listId}`,
    JSON.stringify([...set]),
  );
}

function planLabel(
  mealPlanId: number,
  plans: { id: number; name: string }[],
  index: number,
): string {
  const p = plans.find((x) => x.id === mealPlanId);
  if (p?.name) return p.name;
  return `Menu ${String.fromCharCode(65 + index)}`;
}

export default function ShoppingDetail() {
  const { id: idParam } = useParams();
  const id = idParam ? Number(idParam) : NaN;
  const valid = Number.isFinite(id) && id > 0;

  const { data: detail, isLoading, isError } = useShoppingList(
    valid ? id : undefined,
  );
  const { data: groupedRaw } = useShoppingListGrouped(valid ? id : undefined);
  const { data: mealPlans = [] } = useMealPlans();

  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!valid) return;
    setChecked(loadChecked(String(id)));
  }, [valid, id]);

  const persistChecked = useCallback(
    (next: Set<number>) => {
      if (!valid) return;
      setChecked(next);
      saveChecked(String(id), next);
    },
    [valid, id],
  );

  const toggle = (itemId: number) => {
    const next = new Set(checked);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    persistChecked(next);
  };

  const grouped = useMemo((): ShoppingCategoryGroup[] => {
    if (groupedRaw?.length) return groupedRaw;
    if (!detail?.items?.length) return [];
    return deriveGroupedFromItems(detail.items);
  }, [groupedRaw, detail?.items]);

  const categoryBlocks = useMemo(() => {
    const order = new Map(
      CATEGORY_ORDER.map((c, i) => [c, i] as const),
    );
    return [...grouped].sort(
      (a, b) =>
        (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99),
    );
  }, [grouped]);

  const mealPlanIds = detail?.mealPlanIds ?? [];

  const handleExportPdf = async () => {
    if (!valid) return;
    try {
      const url = resolveApiUrl(`/api/pdf/shopping/${id}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error("PDF request failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `shopping-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not download PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!valid) {
    return (
      <p className="text-text-secondary" role="alert">
        Invalid shopping list.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="text-text-secondary" role="status">
        Loading shopping list…
      </p>
    );
  }

  if (isError || !detail) {
    return (
      <p className="text-destructive" role="alert">
        Could not load this list.{" "}
        <Link to="/shopping" className="underline">
          Back to lists
        </Link>
      </p>
    );
  }

  return (
    <div className="print-area space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          to="/shopping"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All lists
        </Link>
      </div>

      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            {detail.name}
          </h1>
          <p className="mt-1 text-text-secondary">
            {detail.dateRangeStart} → {detail.dateRangeEnd}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section
          aria-labelledby="by-menu-heading"
          className="rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          <h2
            id="by-menu-heading"
            className="font-display text-lg font-semibold text-text-primary"
          >
            By meal plan
          </h2>
          <div className="mt-4 space-y-6">
            {mealPlanIds.length === 0 && (
              <p className="text-sm text-text-muted">No meal plans linked.</p>
            )}
            {mealPlanIds.map((mpId, idx) => (
              <div key={mpId}>
                <h3 className="text-sm font-semibold text-accent">
                  {planLabel(mpId, mealPlans, idx)}
                </h3>
                <ul className="mt-2 space-y-2">
                  {detail.items
                    .filter((item) => {
                      const q = item.quantityPerMealPlan[mpId];
                      return q != null && q > 0;
                    })
                    .map((item) => (
                      <li
                        key={`${mpId}-${item.id}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span className="text-text-primary">
                          {item.ingredientName}
                        </span>
                        <span className="shrink-0 text-text-secondary">
                          {formatQtyForPlan(
                            item.quantityPerMealPlan[mpId],
                            item.displayUnit,
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="by-category-heading"
          className="rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          <h2
            id="by-category-heading"
            className="font-display text-lg font-semibold text-text-primary"
          >
            Total by category
          </h2>
          <div className="mt-4 space-y-6">
            {categoryBlocks.length === 0 && (
              <p className="text-sm text-text-muted">No items.</p>
            )}
            {categoryBlocks.map((block) => (
              <CategoryBlock
                key={block.category}
                block={block}
                mealPlanIds={mealPlanIds}
                mealPlans={mealPlans}
                checked={checked}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CategoryBlock({
  block,
  mealPlanIds,
  mealPlans,
  checked,
  onToggle,
}: {
  block: ShoppingCategoryGroup;
  mealPlanIds: number[];
  mealPlans: { id: number; name: string }[];
  checked: Set<number>;
  onToggle: (id: number) => void;
}) {
  const cat = block.category;
  const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.OTHER;
  const label = CATEGORY_LABEL[cat] ?? cat;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span aria-hidden>{emoji}</span>
        {label}
      </h3>
      <ul className="mt-2 space-y-2">
        {block.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            mealPlanIds={mealPlanIds}
            mealPlans={mealPlans}
            checked={checked.has(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({
  item,
  mealPlanIds,
  mealPlans,
  checked,
  onToggle,
}: {
  item: ShoppingListItem;
  mealPlanIds: number[];
  mealPlans: { id: number; name: string }[];
  checked: boolean;
  onToggle: () => void;
}) {
  const breakdown = mealPlanIds
    .map((mpId, idx) => {
      const q = item.quantityPerMealPlan[mpId];
      if (q == null || q <= 0) return null;
      const name = planLabel(mpId, mealPlans, idx);
      return `${name}: ${formatQtyForPlan(q, item.displayUnit)}`;
    })
    .filter(Boolean);

  return (
    <li className="flex gap-3 rounded-md border border-transparent px-1 py-1.5 text-sm hover:border-border hover:bg-surface-muted/50">
      <label className="flex flex-1 cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium text-text-primary">
            {item.ingredientName}
          </span>
          <span className="text-xs text-text-muted">
            {breakdown.length > 0 ? breakdown.join(" · ") : "—"}
          </span>
        </span>
      </label>
      <span className="shrink-0 font-medium tabular-nums text-text-secondary">
        {formatQtyForPlan(item.totalQuantity, item.displayUnit)}
      </span>
    </li>
  );
}
