"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Plus, Route } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/MainNav";
import { RideCard } from "@/components/mobility/RideCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupLocations, type Location } from "@/components/LocationSelect";
import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

type Carpool = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
  status: string;
  ownerDisplayName: string;
  isOwn?: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ destinations: Location[] }>("/api/v1/destinations")
      .then((data) => setLocations(data.destinations))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);

    const query = params.toString();
    apiFetch<{ carpools: Carpool[] }>(`/api/v1/carpools${query ? `?${query}` : ""}`)
      .then((data) => setCarpools(data.carpools))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [destination, date]);

  useEffect(() => {
    if (!loading && !error) {
      trackEvent("Browse Rides Viewed", {
        destination_filter: destination || null,
        date_filter: date || null,
        results_count: carpools.length,
      });
    }
  }, [loading, error, destination, date, carpools.length]);

  useEffect(() => {
    function reloadBrowse() {
      const params = new URLSearchParams();
      if (destination) params.set("destination", destination);
      if (date) params.set("date", date);
      const query = params.toString();
      apiFetch<{ carpools: Carpool[] }>(`/api/v1/carpools${query ? `?${query}` : ""}`)
        .then((data) => setCarpools(data.carpools))
        .catch(() => undefined);
    }

    function onVisible() {
      if (document.visibilityState === "visible") reloadBrowse();
    }

    window.addEventListener("focus", reloadBrowse);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", reloadBrowse);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [destination, date]);

  const locationGroups = groupLocations(locations);

  return (
    <AppShell>
      <PageHeader
        title="Browse rides"
        subtitle="All open and locked rides from the community, including rides you created."
        action={
          <Link href="/carpools/new" className="btn-primary--inline inline-flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Create ride
          </Link>
        }
      />

      <div className="filter-bar mb-8">
        <div className="filter-field">
          <label htmlFor="filter-destination" className="label-field flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted" aria-hidden />
            Destination
          </label>
          <select
            id="filter-destination"
            className="input-field"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">All destinations</option>
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
        </div>
        <div className="filter-field sm:max-w-xs">
          <label htmlFor="filter-date" className="label-field flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted" aria-hidden />
            Departure date
          </label>
          <input
            id="filter-date"
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-body-md text-error">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ride-card animate-pulse">
              <div className="h-4 w-24 rounded bg-surface-muted" />
              <div className="mt-4 h-8 w-32 rounded bg-surface-muted" />
              <div className="mt-6 h-16 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      ) : carpools.length > 0 ? (
        <div className="space-y-4">
          {carpools.map((carpool) => (
            <RideCard
              key={carpool.id}
              origin={carpool.origin}
              destination={carpool.destination}
              departureAt={carpool.departureAt}
              seatsAvailable={carpool.seatsAvailable}
              totalSeats={carpool.totalSeats}
              status={carpool.status}
              isOwn={carpool.isOwn}
              ownerName={carpool.ownerDisplayName}
              href={`/carpools/${carpool.id}`}
            />
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            icon={Route}
            title="No rides found"
            description="Try changing your filters or create a ride for your journey."
            action={
              <Link href="/carpools/new" className="btn-primary--inline">
                Create a ride
              </Link>
            }
          />
        )
      )}
    </AppShell>
  );
}
