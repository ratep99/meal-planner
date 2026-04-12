import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as profilesApi from "@/api/profiles";
import { profileKeys } from "@/hooks/profiles/keys";
import type {
  ProfileTdeePreviewPayload,
  UpdateProfilePayload,
  UserProfile,
} from "@/types/profile";

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: profilesApi.fetchProfiles,
  });
}

export function useProfile(id: number | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(id ?? -1),
    queryFn: () => profilesApi.fetchProfile(id!),
    enabled: id != null && id > 0,
  });
}

export function useProfileTDEE(id: number | undefined) {
  return useQuery({
    queryKey: profileKeys.tdee(id ?? -1),
    queryFn: () => profilesApi.fetchProfileTdee(id!),
    enabled: id != null && id > 0,
  });
}

export function useProfileTdeePreview(payload: ProfileTdeePreviewPayload | null) {
  return useQuery({
    queryKey:
      payload != null
        ? profileKeys.tdeePreview(payload)
        : ([...profileKeys.all, "tdee-preview", "idle"] as const),
    queryFn: () => profilesApi.previewProfileTdee(payload!),
    enabled: payload != null,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profilesApi.createProfile,
    onSuccess: (created) => {
      qc.setQueryData(profileKeys.detail(created.id), created);
      void qc.invalidateQueries({ queryKey: profileKeys.all });
    },
    onError: () => {
      toast.error("Could not create profile");
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateProfilePayload;
    }) => profilesApi.updateProfile(id, payload),
    onSuccess: (data, { id }) => {
      qc.setQueryData(profileKeys.detail(id), data);
      void qc.invalidateQueries({ queryKey: profileKeys.tdee(id) });
      void qc.invalidateQueries({ queryKey: profileKeys.list() });
    },
    onError: () => {
      toast.error("Could not save profile");
    },
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profilesApi.deleteProfile,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: profileKeys.list() });
      const previous = qc.getQueryData<UserProfile[]>(profileKeys.list());
      qc.setQueryData<UserProfile[]>(
        profileKeys.list(),
        (old) => (Array.isArray(old) ? old.filter((p) => p.id !== id) : []),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(profileKeys.list(), ctx.previous);
      }
      toast.error("Could not delete profile");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: profileKeys.all });
    },
    onSuccess: () => {
      toast.success("Profile deleted");
    },
  });
}
