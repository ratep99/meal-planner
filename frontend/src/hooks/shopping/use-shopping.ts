import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as shoppingApi from "@/api/shopping";
import type {
  GenerateShoppingPayload,
  ShoppingListSummary,
} from "@/types/shopping";
import { shoppingKeys } from "@/hooks/shopping/keys";

export function useShoppingLists() {
  return useQuery({
    queryKey: shoppingKeys.lists(),
    queryFn: shoppingApi.fetchShoppingLists,
  });
}

export function useShoppingList(id: number | undefined) {
  return useQuery({
    queryKey:
      id != null && id > 0
        ? shoppingKeys.detail(id)
        : [...shoppingKeys.all, "detail", "none"] as const,
    queryFn: () => shoppingApi.fetchShoppingList(id!),
    enabled: id != null && id > 0,
  });
}

export function useShoppingListGrouped(id: number | undefined) {
  return useQuery({
    queryKey:
      id != null && id > 0
        ? shoppingKeys.grouped(id)
        : [...shoppingKeys.all, "grouped", "none"] as const,
    queryFn: () => shoppingApi.fetchShoppingListGrouped(id!),
    enabled: id != null && id > 0,
  });
}

export function useGenerateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateShoppingPayload) =>
      shoppingApi.generateShoppingList(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: shoppingKeys.lists() });
    },
  });
}

export function useDeleteShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => shoppingApi.deleteShoppingList(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: shoppingKeys.lists() });
      const previous = qc.getQueryData<ShoppingListSummary[]>(
        shoppingKeys.lists(),
      );
      qc.setQueryData(shoppingKeys.lists(), (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((l) => l.id !== id);
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(shoppingKeys.lists(), ctx.previous);
      }
      toast.error("Could not delete shopping list");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: shoppingKeys.lists() });
    },
  });
}
