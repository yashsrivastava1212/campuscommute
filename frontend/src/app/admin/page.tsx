"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppHeader } from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const [reports, setReports] = useState<{ id: string; reason: string; status: string }[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ reports: typeof reports }>("/api/v1/admin/reports")
      .then((d) => setReports(d.reports))
      .catch(() => setError("Admin access required"));
    apiFetch<Record<string, number>>("/api/v1/admin/metrics")
      .then(setMetrics)
      .catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader backHref="/dashboard" />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {metrics && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm space-y-1">
            <p>Total carpools: {metrics.totalCarpools}</p>
            <p>Avg passengers/taxi: {metrics.avgPassengersPerTaxi?.toFixed(1)}</p>
            <p>Join:create ratio: {metrics.joinToCreateRatio?.toFixed(2)}</p>
          </div>
        )}
        <Link href="/admin/institutional" className="text-sm text-brand-600 hover:underline">
          Institutional dashboard →
        </Link>
        <h2 className="text-sm font-semibold text-slate-500">Moderation Queue</h2>
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p>{r.reason}</p>
              <p className="text-slate-400">{r.status}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
