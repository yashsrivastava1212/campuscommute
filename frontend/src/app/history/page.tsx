"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppHeader } from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

type Trip = {
  id: string;
  destination: string;
  departureAt: string;
  status: string;
  role: string;
};

export default function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  );
}

function HistoryContent() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [analytics, setAnalytics] = useState<{ completedTrips: number; estimatedSavingsInr: number } | null>(null);

  useEffect(() => {
    apiFetch<{ carpools: Trip[] }>("/api/v1/users/me/carpools").then((d) => setTrips(d.carpools));
    apiFetch<{ completedTrips: number; estimatedSavingsInr: number }>("/api/v1/users/me/analytics").then(setAnalytics);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader backHref="/dashboard" />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Trip History</h1>
        {analytics && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p>{analytics.completedTrips} completed trips</p>
            <p className="text-green-700">Est. savings: ₹{analytics.estimatedSavingsInr}</p>
          </div>
        )}
        <ul className="space-y-2">
          {trips.map((t) => (
            <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-medium">{t.destination}</p>
              <p className="text-slate-500">{new Date(t.departureAt).toLocaleString()} · {t.status}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
