"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { groupLocations, type Location } from "@/components/LocationSelect";
import { MainNav } from "@/components/MainNav";
import { apiFetch } from "@/lib/api";

type Carpool = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
};

export default function BrowseCarpoolsPage() {
  return (
    <AuthGuard>
      <BrowseContent />
    </AuthGuard>
  );
}

function BrowseContent() {
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ destinations: Location[] }>("/api/v1/destinations")
      .then((data) => setLocations(data.destinations))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ status: "OPEN" });
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);

    apiFetch<{ carpools: Carpool[] }>(`/api/v1/carpools?${params}`)
      .then((data) => setCarpools(data.carpools))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [destination, date]);

  const locationGroups = groupLocations(locations);

  return (
    <main className="min-h-screen bg-slate-50">
      <MainNav />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Browse Carpools</h1>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="input-field"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">All ending points</option>
            {locationGroups.map((group) => (
              <optgroup key={group.category} label={group.label}>
                {group.locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="space-y-3">
          {carpools.map((carpool) => (
            <li key={carpool.id}>
              <Link
                href={`/carpools/${carpool.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {carpool.origin} → {carpool.destination}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(carpool.departureAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-brand-700">
                    {carpool.seatsAvailable} seats left
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {carpools.length === 0 && !error && (
          <p className="text-center text-sm text-slate-500">No carpools match your filters.</p>
        )}
      </div>
    </main>
  );
}
