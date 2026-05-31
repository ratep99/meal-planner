import { Navigate, useParams } from "react-router-dom";
import ProfileForm from "@/pages/profiles/ProfileForm";

export default function ProfileEdit() {
  const { id } = useParams();
  const n = Number(id);
  if (!Number.isFinite(n)) {
    return <Navigate to="/profiles" replace />;
  }
  return <ProfileForm mode="edit" profileId={n} />;
}
