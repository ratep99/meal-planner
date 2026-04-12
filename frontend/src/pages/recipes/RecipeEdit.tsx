import { Navigate, useParams } from "react-router-dom";
import RecipeForm from "@/pages/recipes/RecipeForm";

export default function RecipeEdit() {
  const { id } = useParams();
  const n = Number(id);
  if (!Number.isFinite(n)) {
    return <Navigate to="/recipes" replace />;
  }
  return <RecipeForm mode="edit" recipeId={n} />;
}
