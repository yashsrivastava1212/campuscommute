"use client";

import Link from "next/link";
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

type OwnedCarpool = {
  id: string;
  origin: string;
  originId: string | null;
  destination: string;
  destinationId: string | null;
  departureAt: string;
  totalSeats: number;
  notes: string | null;
};

export default function EditCarpoolPage() {
  return (
    <AuthGuard>
      <EditContent />
    </AuthGuard>
  );
}

function EditContent() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [carpool, setCarpool] = useState<OwnedCarpool | null>(null);
  const [loading, setLoading] = useState(true);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [totalSeats, setTotalSeats] = useState(4);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ destinations: Location[] }>("/api/v1/destinations"),
      apiFetch<{ carpool: OwnedCarpool | null }>("/api/v1/carpools/mine/owned-open"),
    ])
      .then(([destData, ownedData]) => {
        setLocations(destData.destinations);
        const owned = ownedData.carpool;
        setCarpool(owned);
        if (owned) {
          setOriginId(owned.originId ?? "");
          setDestinationId(owned.destinationId ?? "");
          setDepartureAt(new Date(owned.departureAt).toISOString().slice(0, 16));
          setTotalSeats(owned.totalSeats);
          setNotes(owned.notes ?? "");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!carpool) return;

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

    setIsSaving(true);
    try {
      await apiFetch(`/api/v1/carpools/${carpool.id}`, {
        method: "PATCH",
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
      setError(err instanceof Error ? err.message : "Failed to update carpool");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <MainNav />
        <p className="px-4 py-12 text-center text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!carpool) {
    return (
      <main className="min-h-screen bg-slate-50">
        <MainNav />
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Edit Carpool</h1>
          <p className="mt-3 text-sm text-slate-600">
            You don&apos;t have an open carpool to edit. Create one first.
          </p>
          <Link href="/carpools/new" className="btn-primary mt-6 inline-block w-auto px-6">
            Create Carpool
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <MainNav />

      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Edit Carpool</h1>
        <p className="mt-1 text-sm text-slate-500">Update your open carpool details.</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <LocationSelect
            id="edit-origin"
            label="Starting point"
            value={originId}
            onChange={setOriginId}
            locations={locations}
          />

          <LocationSelect
            id="edit-destination"
            label="Ending point"
            value={destinationId}
            onChange={setDestinationId}
            locations={locations}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
