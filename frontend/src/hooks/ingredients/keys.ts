export const ingredientKeys = {
  all: ["ingredients"] as const,
  list: () => [...ingredientKeys.all, "list"] as const,
  search: (q: string) => [...ingredientKeys.all, "search", q] as const,
};
