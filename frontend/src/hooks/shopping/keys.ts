export const shoppingKeys = {
  all: ["shopping"] as const,
  lists: () => [...shoppingKeys.all, "list"] as const,
  detail: (id: number) => [...shoppingKeys.all, "detail", id] as const,
  grouped: (id: number) => [...shoppingKeys.all, "grouped", id] as const,
};
