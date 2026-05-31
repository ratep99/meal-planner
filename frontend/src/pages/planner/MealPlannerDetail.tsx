import { Navigate, useParams } from "react-router-dom";
import MealPlanner from "@/pages/planner/MealPlanner";

export default function MealPlannerDetail() {
  const { mealPlanId } = useParams();
  const id = mealPlanId ? Number(mealPlanId) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return <Navigate to="/planner" replace />;
  }
  return <MealPlanner initialPlanId={id} />;
}
