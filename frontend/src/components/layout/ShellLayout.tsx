import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarDays,
  Carrot,
  ChefHat,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import { ProfileSwitcher } from "@/components/shared/ProfileSwitcher";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/planner", label: "Meal Planner", icon: CalendarDays },
  { to: "/shopping", label: "Shopping Lists", icon: ShoppingCart },
  { to: "/ingredients", label: "Ingredients", icon: Carrot },
  { to: "/profiles", label: "Profiles", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function ShellLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-sidebar-collapsed flex-col border-r border-border bg-surface",
          "lg:w-sidebar",
          "print:hidden",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3 lg:px-4">
          <span
            className="font-display text-lg font-semibold text-accent max-lg:sr-only"
            title="Meal Planner"
          >
            Meal Planner
          </span>
          <span
            className="font-display text-lg font-semibold text-accent lg:hidden"
            aria-hidden
          >
            MP
          </span>
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 lg:p-3"
          aria-label="Main"
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={
                to === "/dashboard" ||
                to === "/ingredients" ||
                to === "/settings"
              }
              title={label}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  "min-h-11 min-w-11 justify-center lg:justify-start",
                  isActive
                    ? "bg-accent-light font-medium text-accent"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="max-lg:sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-2 lg:p-3">
          <ProfileSwitcher />
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col",
          "pl-sidebar-collapsed lg:pl-sidebar",
          "print:pl-0",
        )}
      >
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-content px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
