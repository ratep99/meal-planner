import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as ingredientsApi from "@/api/ingredients";
import type {
  CreateIngredientPayload,
  Ingredient,
  UpdateIngredientPayload,
} from "@/types/ingredient";
import { ingredientKeys } from "@/hooks/ingredients/keys";

export function useIngredients() {
  return useQuery({
    queryKey: ingredientKeys.list(),
    queryFn: ingredientsApi.fetchAllIngredients,
  });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIngredientPayload) =>
      ingredientsApi.createIngredient(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ingredientKeys.all });
      toast.success("Ingredient created");
    },
    onError: () => {
      toast.error("Could not create ingredient");
    },
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateIngredientPayload }) =>
      ingredientsApi.updateIngredient(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ingredientKeys.all });
      toast.success("Ingredient updated");
    },
    onError: () => {
      toast.error("Could not update ingredient");
    },
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ingredientsApi.deleteIngredient(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ingredientKeys.list() });
      const previous = qc.getQueryData<Ingredient[]>(ingredientKeys.list());
      qc.setQueryData(ingredientKeys.list(), (old) =>
        Array.isArray(old) ? old.filter((x) => x.id !== id) : old,
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ingredientKeys.list(), ctx.previous);
      }
      toast.error("Could not delete ingredient");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ingredientKeys.all });
    },
    onSuccess: () => {
      toast.success("Ingredient deleted");
    },
  });
}
