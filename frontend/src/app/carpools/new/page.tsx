"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  findLocation,
  LocationSelect,
  type Location,
} from "@/components/LocationSelect";
import { MainNav } from "@/components/MainNav";
import { apiFetch } from "@/lib/api";

export default function CreateCarpoolPage() {
  return (
    <AuthGuard>
      <CreateContent />
    </AuthGuard>
  );
}

function CreateContent() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [totalSeats, setTotalSeats] = useState(4);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ destinations: Location[] }>("/api/v1/destinations")
      .then((data) => {
        setLocations(data.destinations);
        const gim = data.destinations.find((d) => d.slug === "gim-campus");
        if (gim) setOriginId(gim.id);
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const origin = findLocation(locations, originId);
    const destination = findLocation(locations, destinationId);

    if (!origin || !destination || !departureAt) {
      setError("Please select starting point, ending point, and departure time.");
      return;
    }

    if (origin.id === destination.id) {
      setError("Starting point and ending point must be different.");
      return;
    }

    setIsLoading(true);
    try {
      const carpool = await apiFetch<{ id: string }>("/api/v1/carpools", {
        method: "POST",
        body: JSON.stringify({
          origin: origin.name,
          originId: origin.id,
          destination: destination.name,
          destinationId: destination.id,
          departureAt: new Date(departureAt).toISOString(),
          totalSeats,
          notes: notes || undefined,
        }),
      });
      router.push(`/carpools/${carpool.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create carpool");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <MainNav />

      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Create Carpool</h1>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <LocationSelect
            id="origin"
            label="Starting point"
            value={originId}
            onChange={setOriginId}
            locations={locations}
            placeholder="Select starting point"
          />

          <LocationSelect
            id="destination"
            label="Ending point"
            value={destinationId}
            onChange={setDestinationId}
            locations={locations}
            placeholder="Select ending point"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Departure date & time
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={departureAt}
              onChange={(e) => setDepartureAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Total seats
            </label>
            <input
              type="number"
              min={2}
              max={8}
              className="input-field"
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="e.g. Can pick up from main gate"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Creating…" : "Create Carpool"}
          </button>
        </form>
      </div>
    </main>
  );
}
