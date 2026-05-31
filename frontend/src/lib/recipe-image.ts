import { resolveApiUrl } from "@/lib/api";

type RecipeImageFields = {
  id?: number;
  imageFilename?: string | null;
  image_filename?: string | null;
};

/**
 * Absolute URL for a stored recipe image (`VITE_API_URL` + `/uploads/recipes/{filename}`),
 * or undefined if no filename. When `VITE_API_URL` is empty, uses same-origin (e.g. Vite proxy).
 */
export function recipeImageUrl(
  recipe: RecipeImageFields | null | undefined,
): string | undefined {
  const fn = (recipe?.imageFilename ?? recipe?.image_filename)?.trim();
  if (!fn) return undefined;
  return resolveApiUrl(`/uploads/recipes/${encodeURIComponent(fn)}`);
}
