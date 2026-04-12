import { api } from "@/lib/api";
import type {
  CreateProfilePayload,
  ProfileTdeePreviewPayload,
  ProfileTdeeResponse,
  UpdateProfilePayload,
  UserProfile,
} from "@/types/profile";

export async function fetchProfiles(): Promise<UserProfile[]> {
  const { data } = await api.get<UserProfile[]>("/api/profiles");
  return data;
}

export async function fetchProfile(id: number): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/api/profiles/${id}`);
  return data;
}

export async function fetchProfileTdee(id: number): Promise<ProfileTdeeResponse> {
  const { data } = await api.get<ProfileTdeeResponse>(`/api/profiles/${id}/tdee`);
  return data;
}

export async function previewProfileTdee(
  payload: ProfileTdeePreviewPayload,
): Promise<ProfileTdeeResponse> {
  const { data } = await api.post<ProfileTdeeResponse>(
    "/api/profiles/tdee-preview",
    payload,
  );
  return data;
}

export async function createProfile(
  payload: CreateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>("/api/profiles", payload);
  return data;
}

export async function updateProfile(
  id: number,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.put<UserProfile>(`/api/profiles/${id}`, payload);
  return data;
}

export async function deleteProfile(id: number): Promise<void> {
  await api.delete(`/api/profiles/${id}`);
}
