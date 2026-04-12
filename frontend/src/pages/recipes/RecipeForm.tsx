import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import * as recipesApi from "@/api/recipes";
import { IngredientSearch } from "@/components/shared/IngredientSearch";
import { MacroChips } from "@/components/shared/MacroChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recipeKeys } from "@/hooks/recipes/keys";
import { useDeleteRecipe, useRecipe } from "@/hooks/recipes/use-recipes";
import { useIngredients } from "@/hooks/useIngredients";
import { ingredientMacros, sumMacros } from "@/lib/macros";
import {
  ingredientCatalogMap,
  resolveFormRowIngredient,
} from "@/lib/recipe-ingredient-resolve";
import { recipeImageUrl } from "@/lib/recipe-image";
import type { Ingredient } from "@/types/ingredient";
import { MEAL_TYPES, type QuantityUnit } from "@/types/enums";
import type { CreateRecipeIngredientPayload } from "@/types/recipe";
import { cn } from "@/lib/utils";

const MEAL_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const rowSchema = z.object({
  key: z.string(),
  recipeIngredientId: z.number().optional(),
  ingredientId: z.number(),
  name: z.string(),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.enum(["GRAMS", "PIECES"]),
  optional: z.boolean(),
  ingredient: z.custom<Ingredient | undefined>().optional(),
});

const recipeFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
    description: z.string().optional(),
    prepTimeMin: z.string().optional(),
    ingredients: z.array(rowSchema).min(1, "Add at least one ingredient"),
  })
  .superRefine((data, ctx) => {
    data.ingredients.forEach((row, i) => {
      if (row.ingredientId <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose an ingredient",
          path: ["ingredients", i, "ingredientId"],
        });
      }
    });
  });

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

type RecipeFormProps =
  | { mode: "create" }
  | { mode: "edit"; recipeId: number };

export default function RecipeForm(props: RecipeFormProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const recipeId = props.mode === "edit" ? props.recipeId : undefined;

  const {
    data: existing,
    isLoading: loadingRecipe,
    isError: recipeError,
  } = useRecipe(recipeId);

  const { data: ingredientCatalogList = [] } = useIngredients();
  const ingredientById = useMemo(
    () => ingredientCatalogMap(ingredientCatalogList),
    [ingredientCatalogList],
  );

  const deleteRecipe = useDeleteRecipe();

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      mealType: "LUNCH",
      description: "",
      prepTimeMin: "",
      ingredients: [],
    },
  });

  const { control, handleSubmit, reset, formState } = form;
  const { isSubmitting } = formState;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });
  const [ingredientSearchKey, setIngredientSearchKey] = useState(0);

  useEffect(() => {
    if (props.mode !== "edit" || !existing) return;
    reset({
      name: existing.name,
      mealType: existing.mealType,
      description: existing.description ?? "",
      prepTimeMin:
        existing.prepTimeMin != null ? String(existing.prepTimeMin) : "",
      ingredients:
        existing.recipeIngredients.length > 0
          ? existing.recipeIngredients.map((ri) => ({
              key: crypto.randomUUID(),
              recipeIngredientId: ri.id,
              ingredientId: ri.ingredientId,
              name:
                ri.ingredient?.name?.trim() ||
                ri.ingredientName?.trim() ||
                "",
              quantity: ri.quantity,
              unit: ri.unit,
              optional: ri.optional,
              ingredient: ri.ingredient,
            }))
          : [],
    });
  }, [existing, props.mode, reset]);

  const ingredientsWatch = useWatch({ control, name: "ingredients" });
  const watchedIngredients = ingredientsWatch ?? [];

  const liveMacros = useMemo(
    () =>
      sumMacros(
        watchedIngredients.map((row) => {
          const ing = resolveFormRowIngredient(row, ingredientById);
          if (!ing) {
            return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
          }
          return ingredientMacros(ing, row.quantity, row.unit as QuantityUnit);
        }),
      ),
    [watchedIngredients, ingredientById],
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const preview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const dropzone = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
    onDrop: (files) => {
      setImageFile(files[0] ?? null);
    },
  });

  const syncIngredientsMutation = useMutation({
    mutationFn: async ({
      recipeId: rid,
      rows,
    }: {
      recipeId: number;
      rows: RecipeFormValues["ingredients"];
    }) => {
      const detail = await recipesApi.fetchRecipe(rid);
      for (const ri of detail.recipeIngredients) {
        await recipesApi.deleteRecipeIngredient(rid, ri.id);
      }
      for (const row of rows) {
        const payload: CreateRecipeIngredientPayload = {
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
          optional: row.optional,
        };
        await recipesApi.addRecipeIngredient(rid, payload);
      }
    },
    onSuccess: (_, { recipeId: rid }) => {
      void qc.invalidateQueries({ queryKey: recipeKeys.detail(rid) });
      void qc.invalidateQueries({ queryKey: recipeKeys.macros(rid) });
      void qc.invalidateQueries({ queryKey: recipeKeys.list() });
    },
    onError: () => {
      toast.error("Could not sync ingredients");
    },
  });

  const parsePrepTime = (s: string | undefined) => {
    if (!s?.trim()) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  const onSubmit = async (values: RecipeFormValues) => {
    try {
      const prepTimeMin = parsePrepTime(values.prepTimeMin);
      if (props.mode === "create") {
        const created = await recipesApi.createRecipe({
          name: values.name,
          mealType: values.mealType,
          description: values.description || null,
          prepTimeMin: prepTimeMin ?? null,
        });
        if (imageFile) {
          try {
            await recipesApi.uploadRecipeImage(created.id, imageFile);
          } catch {
            toast.error("Recipe saved, but image upload failed");
          }
        }
        for (const row of values.ingredients) {
          await recipesApi.addRecipeIngredient(created.id, {
            ingredientId: row.ingredientId,
            quantity: row.quantity,
            unit: row.unit,
            optional: row.optional,
          });
        }
        void qc.invalidateQueries({ queryKey: recipeKeys.all });
        toast.success("Recipe created");
        navigate(`/recipes/${created.id}`);
        return;
      }

      await recipesApi.updateRecipe(props.recipeId, {
        name: values.name,
        mealType: values.mealType,
        description: values.description || null,
        prepTimeMin: prepTimeMin ?? null,
      });
      if (imageFile) {
        try {
          await recipesApi.uploadRecipeImage(props.recipeId, imageFile);
        } catch {
          toast.error("Recipe updated, but image upload failed");
        }
      }
      await syncIngredientsMutation.mutateAsync({
        recipeId: props.recipeId,
        rows: values.ingredients,
      });
      toast.success("Recipe saved");
      navigate(`/recipes/${props.recipeId}`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not save recipe. Try again.";
      toast.error(message);
    }
  };

  function addIngredientFromSearch(ingredient: Ingredient) {
    append({
      key: crypto.randomUUID(),
      ingredientId: ingredient.id,
      name: ingredient.name,
      quantity: 100,
      unit: "GRAMS",
      optional: false,
      ingredient,
    });
    setIngredientSearchKey((k) => k + 1);
  }

  if (props.mode === "edit" && loadingRecipe) {
    return (
      <p className="text-text-secondary" role="status">
        Loading recipe…
      </p>
    );
  }

  if (props.mode === "edit" && (recipeError || !existing)) {
    return (
      <p className="text-destructive" role="alert">
        Recipe not found.
      </p>
    );
  }

  const backHref =
    props.mode === "edit" && recipeId ? `/recipes/${recipeId}` : "/recipes";
  const savedRecipeImageSrc =
    props.mode === "edit" && existing ? recipeImageUrl(existing) : undefined;

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
          {props.mode === "create" ? "New recipe" : "Edit recipe"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-3xl space-y-10"
      >
        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">Basics</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {formState.errors.name && (
              <p className="text-sm text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Meal type</Label>
            <Controller
              control={control}
              name="mealType"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => field.onChange(mt)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        field.value === mt
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface-muted text-text-secondary hover:border-accent/50",
                      )}
                    >
                      {MEAL_LABELS[mt]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep">Prep time (minutes)</Label>
            <Input
              id="prep"
              type="number"
              min={0}
              {...form.register("prepTimeMin")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} {...form.register("description")} />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">Image</h2>
          <div
            {...dropzone.getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-muted px-6 py-10 text-center transition-colors",
              dropzone.isDragActive && "border-accent bg-accent-light/40",
            )}
          >
            <input {...dropzone.getInputProps()} />
            <p className="text-sm text-text-secondary">
              Drag & drop an image, or click to select
            </p>
            <p className="mt-1 text-xs text-text-muted">JPEG, PNG, WebP</p>
          </div>
          {(preview || savedRecipeImageSrc) && (
            <div className="relative mt-4 aspect-video max-h-64 overflow-hidden rounded-lg border border-border bg-surface-muted">
              <img
                src={preview ?? savedRecipeImageSrc ?? ""}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  if (!preview)
                    (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          {imageFile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageFile(null)}
            >
              Remove image
            </Button>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl text-text-primary">
            Ingredients
          </h2>
          <p className="text-sm text-text-secondary">
            Search to add an ingredient; the search box clears after each add.
          </p>

          <IngredientSearch
            key={ingredientSearchKey}
            placeholder="Search or import ingredient…"
            onSelect={addIngredientFromSearch}
          />

          {fields.length === 0 && (
            <p className="text-sm text-text-muted">
              No ingredients yet — use the search box above.
            </p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted/60 px-3 py-3"
              >
                <div className="min-w-[8rem] flex-1 font-medium text-text-primary">
                  {(() => {
                    const row = watchedIngredients[index];
                    if (!row) return "Ingredient";
                    const resolved = resolveFormRowIngredient(row, ingredientById);
                    const label =
                      resolved?.name?.trim() ||
                      row.name?.trim() ||
                      (row.ingredientId > 0
                        ? `Ingredient #${row.ingredientId}`
                        : "");
                    return label || "Choose an ingredient";
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="sr-only" htmlFor={`qty-${field.id}`}>
                    Quantity
                  </Label>
                  <Input
                    id={`qty-${field.id}`}
                    type="number"
                    step="any"
                    min={0}
                    className="h-10 w-24"
                    {...form.register(`ingredients.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                  <Controller
                    control={control}
                    name={`ingredients.${index}.unit`}
                    render={({ field: u }) => (
                      <select
                        className="h-10 rounded-md border border-border bg-surface px-2 text-sm"
                        value={u.value}
                        onChange={u.onChange}
                      >
                        <option value="GRAMS">g</option>
                        <option value="PIECES">pcs</option>
                      </select>
                    )}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    {...form.register(`ingredients.${index}.optional`)}
                  />
                  Optional
                </label>
                {formState.errors.ingredients?.[index]?.ingredientId && (
                  <p className="w-full text-sm text-destructive">
                    {formState.errors.ingredients[index]?.ingredientId?.message}
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0 text-text-muted hover:text-destructive"
                  aria-label="Remove ingredient"
                  onClick={() => remove(index)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
          {formState.errors.ingredients?.root && (
            <p className="text-sm text-destructive">
              {formState.errors.ingredients.root.message}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-6 shadow-card">
          <h2 className="mb-3 font-display text-lg text-text-primary">
            Macro preview
          </h2>
          <MacroChips macros={liveMacros} size="md" />
        </section>

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || syncIngredientsMutation.isPending}
          >
            Save recipe
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
          {props.mode === "edit" && recipeId && (
            <Button
              type="button"
              variant="destructive"
              className="ml-auto"
              onClick={() => {
                if (confirm("Delete this recipe?")) {
                  deleteRecipe.mutate(recipeId, {
                    onSuccess: () => navigate("/recipes"),
                  });
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
