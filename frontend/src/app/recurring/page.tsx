"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppHeader } from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Template = {
  id: string;
  destination: string;
  dayOfWeek: number;
  departureTime: string;
  totalSeats: number;
  isActive: boolean;
};

export default function RecurringPage() {
  return (
    <AuthGuard>
      <RecurringContent />
    </AuthGuard>
  );
}

function RecurringContent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [destination, setDestination] = useState("GOX Airport (Dabolim)");
  const [dayOfWeek, setDayOfWeek] = useState(5);
  const [departureTime, setDepartureTime] = useState("05:30");

  function load() {
    apiFetch<{ templates: Template[] }>("/api/v1/recurring-templates").then((d) => setTemplates(d.templates));
  }

  useEffect(() => { load(); }, []);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/v1/recurring-templates", {
      method: "POST",
      body: JSON.stringify({ destination, dayOfWeek, departureTime, totalSeats: 4 }),
    });
    load();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader backHref="/dashboard" />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Recurring Trips</h1>
        <form onSubmit={createTemplate} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <select className="input-field" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
          <input type="time" className="input-field" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
          <button type="submit" className="btn-primary">Save Template</button>
        </form>
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              {DAYS[t.dayOfWeek]} {t.departureTime} → {t.destination}
              {!t.isActive && <span className="ml-2 text-slate-400">(paused)</span>}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
