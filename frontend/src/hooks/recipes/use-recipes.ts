import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as recipesApi from "@/api/recipes";
import type { RecipeDetail, RecipeListItem } from "@/types/recipe";
import type {
  CreateRecipeIngredientPayload,
  UpdateRecipeIngredientPayload,
  UpdateRecipePayload,
} from "@/types/recipe";
import { recipeKeys } from "@/hooks/recipes/keys";

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.list(),
    queryFn: recipesApi.fetchRecipes,
  });
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? -1),
    queryFn: () => recipesApi.fetchRecipe(id!),
    enabled: id != null && id > 0,
  });
}

export function useRecipeMacros(id: number | undefined) {
  return useQuery({
    queryKey: recipeKeys.macros(id ?? -1),
    queryFn: () => recipesApi.fetchRecipeMacros(id!),
    enabled: id != null && id > 0,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.createRecipe,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recipeKeys.all });
      toast.success("Recipe created");
    },
    onError: () => {
      toast.error("Could not create recipe");
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRecipePayload }) =>
      recipesApi.updateRecipe(id, payload),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: recipeKeys.macros(id) });
      void qc.invalidateQueries({ queryKey: recipeKeys.list() });
      toast.success("Recipe saved");
    },
    onError: () => {
      toast.error("Could not save recipe");
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.deleteRecipe,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: recipeKeys.list() });
      const previous = qc.getQueryData<RecipeListItem[]>(recipeKeys.list());
      qc.setQueryData<RecipeListItem[]>(
        recipeKeys.list(),
        (old) => (Array.isArray(old) ? old.filter((r) => r.id !== id) : []),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(recipeKeys.list(), ctx.previous);
      }
      toast.error("Could not delete recipe");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
    onSuccess: () => {
      toast.success("Recipe deleted");
    },
  });
}

export function useAddRecipeIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      payload,
    }: {
      recipeId: number;
      payload: CreateRecipeIngredientPayload;
    }) => recipesApi.addRecipeIngredient(recipeId, payload),
    onSuccess: (_data, { recipeId }) => {
      void qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.macros(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.list() });
    },
    onError: () => {
      toast.error("Could not add ingredient");
    },
  });
}

export function useUpdateRecipeIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientRowId,
      payload,
    }: {
      recipeId: number;
      ingredientRowId: number;
      payload: UpdateRecipeIngredientPayload;
    }) =>
      recipesApi.updateRecipeIngredient(recipeId, ingredientRowId, payload),
    onMutate: async ({ recipeId, ingredientRowId, payload }) => {
      await qc.cancelQueries({ queryKey: recipeKeys.detail(recipeId) });
      const previous = qc.getQueryData<RecipeDetail>(recipeKeys.detail(recipeId));
      if (previous) {
        qc.setQueryData<RecipeDetail>(recipeKeys.detail(recipeId), {
          ...previous,
          recipeIngredients: previous.recipeIngredients.map((ri) =>
            ri.id === ingredientRowId
              ? {
                  ...ri,
                  ...payload,
                  quantity: payload.quantity ?? ri.quantity,
                  unit: payload.unit ?? ri.unit,
                  optional: payload.optional ?? ri.optional,
                }
              : ri,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, { recipeId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(recipeKeys.detail(recipeId), ctx.previous);
      }
      toast.error("Could not update ingredient");
    },
    onSettled: (_d, _e, { recipeId }) => {
      void qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.macros(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}

export function useDeleteRecipeIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientRowId,
    }: {
      recipeId: number;
      ingredientRowId: number;
    }) => recipesApi.deleteRecipeIngredient(recipeId, ingredientRowId),
    onMutate: async ({ recipeId, ingredientRowId }) => {
      await qc.cancelQueries({ queryKey: recipeKeys.detail(recipeId) });
      const previous = qc.getQueryData<RecipeDetail>(recipeKeys.detail(recipeId));
      if (previous) {
        qc.setQueryData<RecipeDetail>(recipeKeys.detail(recipeId), {
          ...previous,
          recipeIngredients: previous.recipeIngredients.filter(
            (ri) => ri.id !== ingredientRowId,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, { recipeId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(recipeKeys.detail(recipeId), ctx.previous);
      }
      toast.error("Could not remove ingredient");
    },
    onSettled: (_d, _e, { recipeId }) => {
      void qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.macros(recipeId) });
      void qc.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}
