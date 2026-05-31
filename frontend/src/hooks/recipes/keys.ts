export const recipeKeys = {
  all: ["recipes"] as const,
  list: () => [...recipeKeys.all, "list"] as const,
  detail: (id: number) => [...recipeKeys.all, "detail", id] as const,
  macros: (id: number) => [...recipeKeys.all, "detail", id, "macros"] as const,
};
