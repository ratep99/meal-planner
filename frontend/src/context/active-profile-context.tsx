import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useProfiles } from "@/hooks/useProfiles";

type ActiveProfileContextValue = {
  activeProfileId: number | null;
  setActiveProfileId: (id: number) => void;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(
  null,
);

export function useActiveProfileContext() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) {
    throw new Error("ActiveProfileProvider is required");
  }
  return ctx;
}

function ActiveProfileSyncInner() {
  const { activeProfileId, setActiveProfileId } = useActiveProfileContext();
  const { data: profiles } = useProfiles();

  useEffect(() => {
    if (!profiles?.length) return;
    if (
      activeProfileId == null ||
      !profiles.some((p) => p.id === activeProfileId)
    ) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId, setActiveProfileId]);

  return null;
}

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileIdState] = useState<number | null>(
    null,
  );

  const setActiveProfileId = useCallback((id: number) => {
    setActiveProfileIdState(id);
  }, []);

  const value = useMemo(
    () => ({ activeProfileId, setActiveProfileId }),
    [activeProfileId, setActiveProfileId],
  );

  return (
    <ActiveProfileContext.Provider value={value}>
      <ActiveProfileSyncInner />
      {children}
    </ActiveProfileContext.Provider>
  );
}

/** Active profile + list; uses TanStack Query for profiles. */
export function useActiveProfile() {
  const { activeProfileId, setActiveProfileId } = useActiveProfileContext();
  const { data: profiles } = useProfiles();

  const activeProfile = useMemo(
    () => profiles?.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  return {
    activeProfileId,
    setActiveProfileId,
    activeProfile,
    profiles,
  };
}
