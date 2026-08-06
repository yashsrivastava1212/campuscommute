"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Car,
  CarTaxiFront,
  Map,
  Menu,
  PlusCircle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NotificationBell } from "@/components/AppHeader";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { UserMenu } from "@/components/layout/UserMenu";
import { useAuth } from "@/context/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  show?: boolean;
};

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`nav-link ${active ? "nav-link--active" : ""}`}
    >
      <span className="nav-link-indicator" aria-hidden />
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

function SidebarContent({
  homeHref,
  navItems,
  pathname,
  onNavigate,
}: {
  homeHref: string;
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b border-border px-5 py-5">
        <BrandLockup compact href={homeHref} />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
        {navItems
          .filter((item) => item.show !== false)
          .map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.match(pathname)}
              onNavigate={onNavigate}
            />
          ))}
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const hasActiveTrip = Boolean(user?.activeCarpoolId);
  const homeHref = hasActiveTrip ? "/my-trip" : "/carpools";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    { href: "/my-trip", label: "My Trips", icon: Map, match: (p) => p === "/my-trip" },
    {
      href: "/carpools",
      label: "Browse Rides",
      icon: Car,
      match: (p) =>
        p === "/carpools" ||
        (p.startsWith("/carpools/") && !p.includes("/new") && !p.includes("/edit")),
    },
    {
      href: "/carpools/new",
      label: "Create Ride",
      icon: PlusCircle,
      match: (p) => p === "/carpools/new",
      show: !hasActiveTrip,
    },
    {
      href: "/cab-services",
      label: "Cab Services",
      icon: CarTaxiFront,
      match: (p) => p === "/cab-services",
    },
  ];

  return (
    <div className="flex min-h-screen bg-app">
      <aside className="sidebar hidden lg:flex">
        <SidebarContent homeHref={homeHref} navItems={navItems} pathname={pathname} />
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="sidebar-mobile-overlay"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="sidebar-drawer translate-x-0 lg:hidden">
            <div className="relative flex flex-1 flex-col">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 z-10 rounded-lg p-2 text-on-variant hover:bg-surface-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                homeHref={homeHref}
                navItems={navItems}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-on-variant transition-colors hover:bg-surface-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden flex-1 lg:block" />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-container flex-1 px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
