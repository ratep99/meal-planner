import { Link } from "react-router-dom";
import { useActiveProfileContext } from "@/context/active-profile-context";
import { useProfiles } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";

type ProfileSwitcherProps = {
  className?: string;
};

export function ProfileSwitcher({ className }: ProfileSwitcherProps) {
  const { data: profiles, isLoading } = useProfiles();
  const { activeProfileId, setActiveProfileId } = useActiveProfileContext();

  if (isLoading) {
    return (
      <div className={cn("border-t border-border pt-4", className)}>
        <p className="text-xs text-text-muted max-lg:sr-only">Profiles…</p>
        <div className="mt-2 h-11 animate-pulse rounded-full bg-surface-muted" />
      </div>
    );
  }

  if (!profiles?.length) {
    return (
      <div className={cn("border-t border-border pt-4", className)}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted max-lg:sr-only">
          Profiles
        </p>
        <Link
          to="/profiles/new"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Create a profile
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-2 border-t border-border pt-4", className)}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted max-lg:sr-only">
        Active profile
      </p>
      <div
        className={cn(
          "inline-flex rounded-full border border-border bg-surface-muted p-1",
          "max-lg:flex max-lg:flex-col max-lg:rounded-xl max-lg:p-1.5",
        )}
        role="tablist"
        aria-label="Switch profile"
      >
        {profiles.map((p) => {
          const active = p.id === activeProfileId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={p.displayName}
              onClick={() => setActiveProfileId(p.id)}
              className={cn(
                "min-h-11 min-w-[44px] rounded-full px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                active
                  ? "bg-surface text-accent shadow-card"
                  : "text-text-secondary hover:text-text-primary",
                "max-lg:flex max-lg:items-center max-lg:justify-center max-lg:px-0 max-lg:py-2",
              )}
            >
              <span className="max-lg:hidden">{p.displayName}</span>
              <span className="hidden max-lg:inline" aria-hidden>
                {p.displayName.slice(0, 1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
