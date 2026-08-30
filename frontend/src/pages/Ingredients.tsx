import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { importIngredientFromOff } from "@/api/ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlideOver } from "@/components/ui/slide-over";
import {
  useCreateIngredient,
  useDeleteIngredient,
  useIngredients,
  useUpdateIngredient,
} from "@/hooks/useIngredients";
import { ingredientKeys } from "@/hooks/ingredients/keys";
import { formatMacroValue } from "@/lib/macros";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_SOURCES,
  UNIT_TYPES,
  type IngredientCategory,
  type IngredientSource,
  type UnitType,
} from "@/types/enums";
import type { Ingredient } from "@/types/ingredient";
import { toast } from "sonner";

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  PRODUCE: "Produce",
  DAIRY: "Dairy",
  MEAT: "Meat",
  GRAIN: "Grains",
  PANTRY: "Pantry",
  OTHER: "Other",
};

const SOURCE_LABEL: Record<IngredientSource, string> = {
  OPEN_FOOD_FACTS: "Open Food Facts",
  MANUAL: "Manual",
};

type SortKey =
  | "name"
  | "category"
  | "source"
  | "kcal"
  | "protein"
  | "carbs"
  | "fat";

type SortDir = "asc" | "desc";

function sortRows(
  rows: Ingredient[],
  key: SortKey,
  dir: SortDir,
): Ingredient[] {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    // No initialiser: every branch below, including `default`, assigns cmp.
    let cmp: number;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "source":
        cmp = a.source.localeCompare(b.source);
        break;
      case "kcal":
        cmp = a.kcalPer100g - b.kcalPer100g;
        break;
      case "protein":
        cmp = a.proteinPer100g - b.proteinPer100g;
        break;
      case "carbs":
        cmp = a.carbsPer100g - b.carbsPer100g;
        break;
      case "fat":
        cmp = a.fatPer100g - b.fatPer100g;
        break;
      default:
        cmp = 0;
    }
    return cmp * m;
  });
}

type PanelMode = "create" | "edit";

const emptyForm = {
  name: "",
  category: "OTHER" as IngredientCategory,
  unitType: "WEIGHT" as UnitType,
  pieceWeightGrams: "" as string,
  kcalPer100g: "",
  proteinPer100g: "",
  carbsPer100g: "",
  fatPer100g: "",
  fiberPer100g: "",
  manualOverride: false,
};

export default function Ingredients() {
  const { data: all = [], isLoading, isError, error } = useIngredients();
  const createIng = useCreateIngredient();
  const updateIng = useUpdateIngredient();
  const deleteIng = useDeleteIngredient();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [categoryFilter, setCategoryFilter] = useState<
    IngredientCategory | "ALL"
  >("ALL");
  const [sourceFilter, setSourceFilter] = useState<
    IngredientSource | "ALL"
  >("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<"manual" | "import">("manual");
  const [offQuery, setOffQuery] = useState("");
  const [form, setForm] = useState(emptyForm);

  const importOff = useMutation({
    mutationFn: importIngredientFromOff,
    onSuccess: async (ing) => {
      await qc.invalidateQueries({ queryKey: ingredientKeys.all });
      toast.success(`Imported “${ing.name}”`);
      setPanelOpen(false);
      setOffQuery("");
    },
    onError: () => toast.error("Could not import from Open Food Facts"),
  });

  const filtered = useMemo(() => {
    let rows = all;
    if (categoryFilter !== "ALL") {
      rows = rows.filter((r) => r.category === categoryFilter);
    }
    if (sourceFilter !== "ALL") {
      rows = rows.filter((r) => r.source === sourceFilter);
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return sortRows(rows, sortKey, sortDir);
  }, [all, categoryFilter, sourceFilter, debouncedSearch, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    setPanelMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setPanelTab("manual");
    setPanelOpen(true);
  };

  const openEdit = (ing: Ingredient) => {
    setPanelMode("edit");
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      category: ing.category,
      unitType: ing.unitType,
      pieceWeightGrams:
        ing.pieceWeightGrams != null ? String(ing.pieceWeightGrams) : "",
      kcalPer100g: String(ing.kcalPer100g),
      proteinPer100g: String(ing.proteinPer100g),
      carbsPer100g: String(ing.carbsPer100g),
      fatPer100g: String(ing.fatPer100g),
      fiberPer100g: String(ing.fiberPer100g),
      manualOverride: ing.manualOverride,
    });
    setPanelTab("manual");
    setPanelOpen(true);
  };

  const parseNum = (s: string, fallback = 0) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  const submitManual = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name,
      category: form.category,
      unitType: form.unitType,
      pieceWeightGrams:
        form.unitType === "PIECE" && form.pieceWeightGrams.trim()
          ? parseNum(form.pieceWeightGrams, NaN)
          : null,
      kcalPer100g: parseNum(form.kcalPer100g),
      proteinPer100g: parseNum(form.proteinPer100g),
      carbsPer100g: parseNum(form.carbsPer100g),
      fatPer100g: parseNum(form.fatPer100g),
      fiberPer100g: parseNum(form.fiberPer100g),
      source: "MANUAL" as const,
      manualOverride: form.manualOverride,
    };
    if (form.unitType === "PIECE" && !Number.isFinite(payload.pieceWeightGrams as number)) {
      toast.error("Piece weight (g) is required for piece-based ingredients");
      return;
    }
    try {
      if (panelMode === "create") {
        await createIng.mutateAsync(payload);
      } else if (editingId != null) {
        await updateIng.mutateAsync({ id: editingId, payload });
      }
      setPanelOpen(false);
    } catch {
      /* toasts in hooks */
    }
  };

  const SortTh = ({
    k,
    children,
    className,
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={cn("px-3 py-2", className)}>
      <button
        type="button"
        className="font-medium text-text-muted hover:text-text-primary"
        onClick={() => toggleSort(k)}
      >
        {children}
        {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-text-primary">Ingredients</h1>
        <Button type="button" onClick={openCreate}>
          Add ingredient
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="max-w-md flex-1">
          <Label htmlFor="ing-search" className="sr-only">
            Search
          </Label>
          <Input
            id="ing-search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <Label htmlFor="cat-filter" className="mb-1 block text-xs text-text-muted">
              Category
            </Label>
            <select
              id="cat-filter"
              className="h-11 min-w-[140px] rounded-md border border-border bg-surface px-3 text-sm"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as IngredientCategory | "ALL")
              }
            >
              <option value="ALL">All</option>
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="src-filter" className="mb-1 block text-xs text-text-muted">
              Source
            </Label>
            <select
              id="src-filter"
              className="h-11 min-w-[160px] rounded-md border border-border bg-surface px-3 text-sm"
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value as IngredientSource | "ALL")
              }
            >
              <option value="ALL">All</option>
              {INGREDIENT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-text-secondary" role="status">
          Loading ingredients…
        </p>
      )}
      {isError && (
        <p className="text-destructive" role="alert">
          {(error as Error)?.message ?? "Could not load ingredients"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide">
                <SortTh k="name">Name</SortTh>
                <SortTh k="category">Category</SortTh>
                <SortTh k="source">Source</SortTh>
                <SortTh k="kcal" className="text-right">
                  Kcal/100g
                </SortTh>
                <SortTh k="protein" className="text-right">
                  P
                </SortTh>
                <SortTh k="carbs" className="text-right">
                  C
                </SortTh>
                <SortTh k="fat" className="text-right">
                  F
                </SortTh>
                <th className="px-3 py-2 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/50"
                >
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {CATEGORY_LABEL[row.category]}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {SOURCE_LABEL[row.source]}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMacroValue(row.kcalPer100g, "kcal")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-macro-protein">
                    {formatMacroValue(row.proteinPer100g, "g")}g
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-macro-carbs">
                    {formatMacroValue(row.carbsPer100g, "g")}g
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-macro-fat">
                    {formatMacroValue(row.fatPer100g, "g")}g
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-2"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-2 text-destructive hover:text-destructive"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete “${row.name}”? This cannot be undone.`,
                            )
                          ) {
                            void deleteIng.mutateAsync(row.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-text-secondary">
              No ingredients match your filters.
            </p>
          )}
        </div>
      )}

      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={
          panelMode === "create" ? "Add ingredient" : "Edit ingredient"
        }
      >
        {panelMode === "create" && (
          <div className="mb-4 flex gap-2 border-b border-border pb-4">
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                panelTab === "manual"
                  ? "bg-accent-light text-accent"
                  : "text-text-secondary hover:bg-surface-muted",
              )}
              onClick={() => setPanelTab("manual")}
            >
              Manual
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                panelTab === "import"
                  ? "bg-accent-light text-accent"
                  : "text-text-secondary hover:bg-surface-muted",
              )}
              onClick={() => setPanelTab("import")}
            >
              Import from Open Food Facts
            </button>
          </div>
        )}

        {panelTab === "import" && panelMode === "create" ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Search Open Food Facts by product name. A new ingredient will be
              saved to your library.
            </p>
            <div className="space-y-2">
              <Label htmlFor="off-q">Search query</Label>
              <Input
                id="off-q"
                value={offQuery}
                onChange={(e) => setOffQuery(e.target.value)}
                placeholder="e.g. greek yogurt"
              />
            </div>
            <Button
              type="button"
              disabled={importOff.isPending || offQuery.trim().length < 2}
              onClick={() => importOff.mutate(offQuery.trim())}
            >
              {importOff.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitManual();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="f-name">Name</Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-cat">Category</Label>
              <select
                id="f-cat"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as IngredientCategory,
                  }))
                }
              >
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-unit">Unit type</Label>
              <select
                id="f-unit"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={form.unitType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unitType: e.target.value as UnitType,
                  }))
                }
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u === "WEIGHT" ? "Weight (g)" : "Piece"}
                  </option>
                ))}
              </select>
            </div>
            {form.unitType === "PIECE" && (
              <div className="space-y-2">
                <Label htmlFor="f-pw">Piece weight (g)</Label>
                <Input
                  id="f-pw"
                  type="number"
                  step="any"
                  min={0}
                  value={form.pieceWeightGrams}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pieceWeightGrams: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="f-k">Kcal / 100g</Label>
                <Input
                  id="f-k"
                  type="number"
                  step="any"
                  value={form.kcalPer100g}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kcalPer100g: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-p">Protein / 100g</Label>
                <Input
                  id="f-p"
                  type="number"
                  step="any"
                  value={form.proteinPer100g}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, proteinPer100g: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-c">Carbs / 100g</Label>
                <Input
                  id="f-c"
                  type="number"
                  step="any"
                  value={form.carbsPer100g}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, carbsPer100g: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-f">Fat / 100g</Label>
                <Input
                  id="f-f"
                  type="number"
                  step="any"
                  value={form.fatPer100g}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fatPer100g: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="f-fi">Fiber / 100g</Label>
                <Input
                  id="f-fi"
                  type="number"
                  step="any"
                  value={form.fiberPer100g}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fiberPer100g: e.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.manualOverride}
                onChange={(e) =>
                  setForm((f) => ({ ...f, manualOverride: e.target.checked }))
                }
              />
              Manual override (disable OFF sync)
            </label>
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={createIng.isPending || updateIng.isPending}
              >
                {panelMode === "create" ? "Create" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}
