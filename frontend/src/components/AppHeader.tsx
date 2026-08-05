"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/api";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    { id: string; title: string; body: string; isRead: boolean; createdAt: string }[]
  >([]);

  useEffect(() => {
    apiFetch<{ notifications: typeof items; unreadCount: number }>("/api/v1/notifications")
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => undefined);
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold">Notifications</div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No notifications</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`cursor-pointer border-b border-slate-50 px-4 py-3 text-sm ${!n.isRead ? "bg-brand-50" : ""}`}
                  onClick={() => !n.isRead && markRead(n.id)}
                >
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-slate-600">{n.body}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Logo compact />
          {backHref && (
            <Link href={backHref} className="text-sm text-brand-600 hover:text-brand-700">
              Back
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
