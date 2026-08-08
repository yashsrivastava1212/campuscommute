"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  findLocation,
  LocationSelect,
  type Location,
} from "@/components/LocationSelect";
import { AppShell } from "@/components/MainNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";
import { isSameCalendarDay } from "@/lib/format";

export default function CreateCarpoolPage() {
  return (
    <AuthGuard>
      <CreateContent />
    </AuthGuard>
  );
}

function CreateContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [totalSeats, setTotalSeats] = useState(4);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const samePoints = Boolean(originId && destinationId && originId === destinationId);

  useEffect(() => {
    apiFetch<{ destinations: Location[] }>("/api/v1/destinations")
      .then((data) => {
        setLocations(data.destinations);
        const gim = data.destinations.find((d) => d.slug === "gim-campus");
        if (gim) setOriginId(gim.id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (samePoints) {
      setDestinationId("");
    }
  }, [originId, samePoints]);

  function handleOriginChange(id: string) {
    setOriginId(id);
    if (destinationId === id) setDestinationId("");
    if (error) setError("");
  }

  function handleDestinationChange(id: string) {
    setDestinationId(id);
    if (error) setError("");
  }

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

    const proposedDeparture = new Date(departureAt);
    try {
      const { createdTrips, carpools: activeTrips } = await apiFetch<{
        createdTrips: Array<{ departureAt: string; status: string }>;
        carpools: Array<{ departureAt: string; status: string }>;
      }>("/api/v1/carpools/mine/active");

      const sameDayCreated = (createdTrips ?? []).some(
        (trip) =>
          (trip.status === "OPEN" || trip.status === "LOCKED") &&
          isSameCalendarDay(trip.departureAt, proposedDeparture)
      );
      if (sameDayCreated) {
        setError("You already created a ride on this date. You can only create one ride per day.");
        return;
      }

      const sameDayJoined = (activeTrips ?? []).some(
        (trip) =>
          (trip.status === "OPEN" || trip.status === "LOCKED") &&
          isSameCalendarDay(trip.departureAt, proposedDeparture)
      );
      if (sameDayJoined) {
        setError(
          "You already have a trip on this date. Leave that booking before creating another ride."
        );
        return;
      }
    } catch {
      // Backend validates if this pre-check fails.
    }

    setIsLoading(true);
    try {
      const created = await apiFetch<{ id: string }>("/api/v1/carpools", {
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
      await refreshUser();
      router.push(`/my-trip?trip=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create carpool");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-form">
        <PageHeader
          title="Create a ride"
          subtitle="Share your journey with fellow GIM students."
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h2 className="form-section-title flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden />
              Route
            </h2>
            <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
              <LocationSelect
                id="origin"
                label="From"
                value={originId}
                onChange={handleOriginChange}
                locations={locations}
                placeholder="Select starting point"
              />
              <LocationSelect
                id="destination"
                label="To"
                value={destinationId}
                onChange={handleDestinationChange}
                locations={locations}
                placeholder="Select destination"
                excludeId={originId}
              />
              {samePoints && (
                <p className="rounded-xl border border-error/20 bg-error-container px-3 py-2 text-body-md text-error">
                  Pickup and drop-off cannot be the same location.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="form-section-title flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden />
              Schedule
            </h2>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
              <label htmlFor="departure" className="label-field flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted" aria-hidden />
                Departure date & time
              </label>
              <input
                id="departure"
                type="datetime-local"
                className="input-field"
                value={departureAt}
                onChange={(e) => setDepartureAt(e.target.value)}
                required
              />
            </div>
          </section>

          <section>
            <h2 className="form-section-title flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              Ride details
            </h2>
            <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
              <div>
                <label htmlFor="seats" className="label-field">
                  Available seats
                </label>
                <input
                  id="seats"
                  type="number"
                  min={2}
                  max={8}
                  className="input-field"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="notes" className="label-field">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  className="input-field min-h-[88px] resize-y"
                  placeholder="e.g. Can pick up from main gate"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-body-md text-error">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/carpools" className="btn-secondary--inline text-center">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary--inline min-w-[140px]"
              disabled={isLoading || samePoints || !originId || !destinationId}
            >
              {isLoading ? "Creating…" : "Create ride"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
