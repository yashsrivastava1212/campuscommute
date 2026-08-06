"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    { id: string; title: string; body: string; isRead: boolean; createdAt: string }[]
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ notifications: typeof items; unreadCount: number }>("/api/v1/notifications")
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markRead(id: string) {
    await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-border bg-white p-2.5 text-on-variant shadow-sm transition-colors hover:border-border-hover hover:bg-surface-muted"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-medium text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-navy/10 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="notification-panel">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-title-lg text-on-surface">Notifications</h3>
            </div>
            <ul className="max-h-[min(24rem,calc(100vh-8rem))] overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-10 text-center text-body-md text-slate-member">
                  No notifications yet
                </li>
              ) : (
                items.map((n) => (
                  <li
                    key={n.id}
                    className={`cursor-pointer border-b border-border/60 px-4 py-3 text-body-md transition-colors hover:bg-surface-muted ${
                      !n.isRead ? "bg-emerald-light/30" : ""
                    }`}
                    onClick={() => !n.isRead && markRead(n.id)}
                  >
                    <p className="font-medium text-on-surface">{n.title}</p>
                    <p className="mt-0.5 text-on-variant">{n.body}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

export function AppHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="app-topbar">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="text-body-md font-medium text-on-variant transition-colors hover:text-on-surface"
          >
            ← Back
          </Link>
        )}
      </div>
      <NotificationBell />
    </header>
  );
}
