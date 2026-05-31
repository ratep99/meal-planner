import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { importIngredientFromOff, searchIngredients } from "@/api/ingredients";
import { ingredientKeys } from "@/hooks/ingredients/keys";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Ingredient } from "@/types/ingredient";
import { cn } from "@/lib/utils";

type IngredientSearchProps = {
  onSelect: (ingredient: Ingredient) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function IngredientSearch({
  onSelect,
  disabled,
  placeholder = "Search ingredients…",
  className,
}: IngredientSearchProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["ingredients", "search", debounced],
    queryFn: () => searchIngredients(debounced),
    enabled: !disabled && debounced.trim().length >= 1,
  });

  const importMutation = useMutation({
    mutationFn: importIngredientFromOff,
    onSuccess: (ingredient) => {
      void qc.invalidateQueries({ queryKey: ingredientKeys.all });
      onSelect(ingredient);
      setQuery("");
      setOpen(false);
    },
    onError: () => {
      toast.error("Could not import from Open Food Facts");
    },
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <Input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
        )}
      </div>

      {open && (debounced.trim().length >= 1 || importMutation.isPending) && (
        <div
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-modal"
          role="listbox"
        >
          {results.map((ing) => (
            <button
              key={ing.id}
              type="button"
              role="option"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-surface-muted"
              onClick={() => {
                onSelect(ing);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium text-text-primary">{ing.name}</span>
              <span className="text-xs text-text-muted">
                {ing.source === "OPEN_FOOD_FACTS" ? "Open Food Facts" : "Manual"}
              </span>
            </button>
          ))}

          {debounced.trim().length >= 2 && results.length === 0 && !isFetching && (
            <div className="border-t border-border px-3 py-2">
              <p className="mb-2 text-xs text-text-muted">No local matches.</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={importMutation.isPending}
                onClick={() => importMutation.mutate(debounced.trim())}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import from Open Food Facts"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
