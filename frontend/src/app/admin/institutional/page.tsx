"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppHeader } from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

export default function InstitutionalDashboardPage() {
  return (
    <AuthGuard>
      <InstitutionalContent />
    </AuthGuard>
  );
}

function InstitutionalContent() {
  const [report, setReport] = useState<{
    summary: string;
    popularDestinations: { destination: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    apiFetch<typeof report>("/api/v1/admin/institutional-report").then(setReport).catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader backHref="/admin" />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Institutional Dashboard</h1>
        {report ? (
          <>
            <p className="text-sm text-slate-600">{report.summary}</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-500">Popular Destinations</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {report.popularDestinations.map((d) => (
                  <li key={d.destination} className="flex justify-between">
                    <span>{d.destination}</span>
                    <span>{d.count} carpools</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Loading report…</p>
        )}
      </div>
    </main>
  );
}
