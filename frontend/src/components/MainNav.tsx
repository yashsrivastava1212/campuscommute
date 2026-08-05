"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";

function navClass(active: boolean) {
  return active
    ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

export function MainNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [hasOwnedCarpool, setHasOwnedCarpool] = useState(false);

  useEffect(() => {
    apiFetch<{ carpool: { id: string } | null }>("/api/v1/carpools/mine/owned-open")
      .then((data) => setHasOwnedCarpool(Boolean(data.carpool)))
      .catch(() => setHasOwnedCarpool(false));
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Logo compact />

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/carpools/new" className={navClass(pathname === "/carpools/new")}>
            Create
          </Link>
          <Link href="/carpools" className={navClass(pathname === "/carpools")}>
            Browse
          </Link>
          {hasOwnedCarpool && (
            <Link href="/carpools/edit" className={navClass(pathname === "/carpools/edit")}>
              Edit
            </Link>
          )}
          <Link href="/cab-services" className={navClass(pathname === "/cab-services")}>
            Cab Services
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">
            {user?.displayName ?? user?.email}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="text-slate-500 hover:text-slate-700"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
