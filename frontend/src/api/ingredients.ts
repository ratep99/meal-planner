import { api } from "@/lib/api";
import type {
  CreateIngredientPayload,
  Ingredient,
  UpdateIngredientPayload,
} from "@/types/ingredient";

export async function fetchAllIngredients(): Promise<Ingredient[]> {
  const { data } = await api.get<Ingredient[]>("/api/ingredients");
  return data;
}

export async function searchIngredients(query: string): Promise<Ingredient[]> {
  const { data } = await api.get<Ingredient[]>("/api/ingredients", {
    params: query ? { search: query } : {},
  });
  return data;
}

export async function createIngredient(
  payload: CreateIngredientPayload,
): Promise<Ingredient> {
  const { data } = await api.post<Ingredient>("/api/ingredients", payload);
  return data;
}

export async function updateIngredient(
  id: number,
  payload: UpdateIngredientPayload,
): Promise<Ingredient> {
  const { data } = await api.put<Ingredient>(
    `/api/ingredients/${id}`,
    payload,
  );
  return data;
}

export async function deleteIngredient(id: number): Promise<void> {
  await api.delete(`/api/ingredients/${id}`);
}

export async function importIngredientFromOff(
  query: string,
): Promise<Ingredient> {
  const { data } = await api.post<Ingredient>(
    "/api/ingredients/import",
    {},
    { params: { query } },
  );
  return data;
}
