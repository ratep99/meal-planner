export const mealPlanKeys = {
  all: ["mealplans"] as const,
  list: () => [...mealPlanKeys.all, "list"] as const,
  detail: (id: number) => [...mealPlanKeys.all, "detail", id] as const,
  summary: (id: number) =>
    [...mealPlanKeys.all, "detail", id, "summary"] as const,
};
