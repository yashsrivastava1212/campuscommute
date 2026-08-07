"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthProvider";
import { resolveDisplayName } from "@/lib/format";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = resolveDisplayName(user?.displayName, user?.email);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border/80 bg-white px-2 py-1.5 pl-1.5 transition-all hover:border-border-hover hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald/30"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden max-w-[120px] truncate text-body-md font-medium text-on-surface sm:block">
          {displayName}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[200px] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg animate-dropdown"
          role="menu"
        >
          <div className="border-b border-border/60 px-4 py-3">
            <p className="truncate text-body-md font-medium text-on-surface">{displayName}</p>
            <p className="truncate text-label-md text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-body-md text-on-variant transition-colors hover:bg-surface-muted hover:text-on-surface"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
