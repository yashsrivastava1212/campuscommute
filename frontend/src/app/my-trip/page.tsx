"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/MainNav";
import { DiscussionPanel } from "@/components/DiscussionPanel";
import { RouteDisplay } from "@/components/mobility/RouteDisplay";
import { TripInfoGrid } from "@/components/TripInfoGrid";
import {
  findLocation,
  LocationSelect,
  type Location,
} from "@/components/LocationSelect";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";
import { formatRideDate, formatRideTime } from "@/lib/format";

type Member = {
  id: string;
  userId: string;
  displayName: string | null;
  role: string;
};

type JoinRequest = {
  id: string;
  status: string;
  displayName: string | null;
  requesterId: string;
};

type CarpoolDetail = {
  id: string;
  origin: string;
  originId: string | null;
  destination: string;
  destinationId: string | null;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
  status: string;
  isLocked: boolean;
  notes: string | null;
  ownerId: string;
  ownerDisplayName: string;
  joinCutoffAt: string;
  members: Member[];
};

export default function MyTripPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <AppShell>
            <p className="py-12 text-center text-body-md text-on-variant">Loading your bookings…</p>
          </AppShell>
        }
      >
        <MyTripContent />
      </Suspense>
    </AuthGuard>
  );
}

function MyTripContent() {
  const searchParams = useSearchParams();
  const urlTripId = searchParams.get("trip");
  const { user, refreshUser } = useAuth();
  const [trips, setTrips] = useState<CarpoolDetail[]>([]);
  const [createdTrips, setCreatedTrips] = useState<CarpoolDetail[]>([]);
  const [joinedTrips, setJoinedTrips] = useState<CarpoolDetail[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [totalSeats, setTotalSeats] = useState(4);
  const [notes, setNotes] = useState("");

  const carpool = trips.find((trip) => trip.id === selectedTripId) ?? null;
  const isOwner = user?.id === carpool?.ownerId;
  const isMember = Boolean(carpool?.members?.some((m) => m.userId === user?.id));
  const isLocked = carpool?.status === "LOCKED" || carpool?.isLocked;

  function syncTripForm(trip: CarpoolDetail) {
    setOriginId(trip.originId ?? "");
    setDestinationId(trip.destinationId ?? "");
    setDepartureAt(new Date(trip.departureAt).toISOString().slice(0, 16));
    setTotalSeats(trip.totalSeats);
    setNotes(trip.notes ?? "");
    setEditing(false);
  }

  async function loadJoinRequests(trip: CarpoolDetail) {
    if (user?.id === trip.ownerId && trip.status === "OPEN") {
      const data = await apiFetch<{ joinRequests: JoinRequest[] }>(
        `/api/v1/carpools/${trip.id}/join-requests`
      );
      setJoinRequests(data.joinRequests.filter((j) => j.status === "PENDING"));
    } else {
      setJoinRequests([]);
    }
  }

  const loadTrips = useCallback(
    (preferredTripId?: string | null, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      apiFetch<{
        carpool: CarpoolDetail | null;
        carpools: CarpoolDetail[];
        createdTrips: CarpoolDetail[];
        joinedTrips: CarpoolDetail[];
      }>("/api/v1/carpools/mine/active")
        .then(async (data) => {
          const normalize = (trip: CarpoolDetail) => ({
            ...trip,
            members: trip.members ?? [],
          });
          const loadedTrips = (data.carpools ?? []).map(normalize);
          const loadedCreated = (
            data.createdTrips ?? loadedTrips.filter((trip) => trip.ownerId === user?.id)
          ).map(normalize);
          const loadedJoined = (
            data.joinedTrips ?? loadedTrips.filter((trip) => trip.ownerId !== user?.id)
          ).map(normalize);

          setTrips(loadedTrips);
          setCreatedTrips(loadedCreated);
          setJoinedTrips(loadedJoined);

          const nextSelectedId =
            (preferredTripId && loadedTrips.some((trip) => trip.id === preferredTripId)
              ? preferredTripId
              : null) ??
            (user?.activeCarpoolId &&
            loadedTrips.some((trip) => trip.id === user.activeCarpoolId)
              ? user.activeCarpoolId
              : null) ??
            loadedTrips[0]?.id ??
            null;

          setSelectedTripId(nextSelectedId);

          const selectedTrip = loadedTrips.find((trip) => trip.id === nextSelectedId);
          if (selectedTrip) {
            syncTripForm(selectedTrip);
            await loadJoinRequests(selectedTrip);
          } else {
            setJoinRequests([]);
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bookings"))
        .finally(() => {
          if (!options?.silent) {
            setLoading(false);
          }
        });
    },
    [user?.id, user?.activeCarpoolId]
  );

  function selectTrip(tripId: string) {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    setSelectedTripId(tripId);
    syncTripForm(trip);
    loadJoinRequests(trip).catch(() => undefined);
  }

  useEffect(() => {
    apiFetch<{ destinations: Location[] }>("/api/v1/destinations")
      .then((data) => setLocations(data.destinations))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      if (urlTripId) {
        await refreshUser().catch(() => undefined);
      }
      if (!cancelled) {
        loadTrips(urlTripId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, urlTripId, loadTrips, refreshUser]);

  useEffect(() => {
    if (loading || trips.length === 0) return;
    if (selectedTripId && trips.some((trip) => trip.id === selectedTripId)) return;

    const fallbackId =
      urlTripId && trips.some((trip) => trip.id === urlTripId)
        ? urlTripId
        : trips[0]?.id ?? null;

    if (!fallbackId) return;

    const fallbackTrip = trips.find((trip) => trip.id === fallbackId);
    if (!fallbackTrip) return;

    setSelectedTripId(fallbackId);
    syncTripForm(fallbackTrip);
    loadJoinRequests(fallbackTrip).catch(() => undefined);
  }, [loading, trips, selectedTripId, urlTripId, user?.id]);

  async function handleJoinAction(id: string, action: "accept" | "reject") {
    setActionLoading(true);
    try {
      await apiFetch(`/api/v1/join-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      loadTrips(selectedTripId, { silent: true });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function lockCarpool() {
    if (!carpool) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${carpool.id}/lock`, { method: "POST", body: "{}" });
      loadTrips(carpool.id, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lock");
    } finally {
      setActionLoading(false);
    }
  }

  async function unlockCarpool() {
    if (!carpool) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${carpool.id}/unlock`, { method: "POST", body: "{}" });
      loadTrips(carpool.id, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (destinationId === originId) {
      setDestinationId("");
    }
  }, [originId, destinationId]);

  async function saveEdits(event: React.FormEvent) {
    event.preventDefault();
    if (!carpool) return;

    const origin = findLocation(locations, originId);
    const destination = findLocation(locations, destinationId);

    if (!origin || !destination || !departureAt) {
      setError("Please fill in all required fields.");
      return;
    }

    if (origin.id === destination.id) {
      setError("Starting and ending points must be different.");
      return;
    }

    setActionLoading(true);
    setError("");
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
      setEditing(false);
      loadTrips(carpool.id, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setActionLoading(false);
    }
  }

  async function leaveTrip() {
    if (!carpool || !confirm("Leave this carpool?")) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${carpool.id}/leave`, { method: "POST", body: "{}" });
      await refreshUser();
      loadTrips(undefined, { silent: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave");
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelTrip() {
    if (!carpool || !confirm("Cancel this carpool for all members?")) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${carpool.id}`, { method: "DELETE" });
      await refreshUser();
      loadTrips(undefined, { silent: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="py-12 text-center text-body-md text-on-variant">Loading your bookings…</p>
      </AppShell>
    );
  }

  if (trips.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="text-headline-lg text-on-surface">My Bookings</h1>
          <p className="mt-2 text-body-lg text-on-variant">
            You don&apos;t have any active bookings yet. Browse open trips or create your own.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/carpools" className="btn-primary--inline">
              Browse rides
            </Link>
            <Link href="/carpools/new" className="btn-secondary--inline">
              Create ride
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!carpool) {
    return (
      <AppShell>
        <p className="py-12 text-center text-body-md text-on-variant">Loading booking details…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">My Bookings</h1>
          <p className="mt-1.5 text-body-lg text-on-variant">
            {trips.length > 1
              ? `${trips.length} active bookings — select one to manage.`
              : "Your active booking — manage, chat, and coordinate here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && <span className="badge-owner">Owner</span>}
          {isMember && !isOwner && <span className="badge-member">Member</span>}
          {isLocked && <span className="badge-pending">Locked</span>}
        </div>
      </div>

      {trips.length > 0 && (
        <div className="mb-8 space-y-6">
          {createdTrips.length > 0 && (
            <div>
              <p className="label-field mb-3">Trips you created</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {createdTrips.map((trip) => (
                  <TripSelectCard
                    key={trip.id}
                    trip={trip}
                    selected={trip.id === selectedTripId}
                    badge="Owner"
                    footer="Created by you"
                    onSelect={() => selectTrip(trip.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {joinedTrips.length > 0 && (
            <div>
              <p className="label-field mb-3">Trips you joined</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {joinedTrips.map((trip) => (
                  <TripSelectCard
                    key={trip.id}
                    trip={trip}
                    selected={trip.id === selectedTripId}
                    badge="Member"
                    footer={`Trip created by ${trip.ownerDisplayName}`}
                    onSelect={() => selectTrip(trip.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-emerald/20 bg-white p-6 shadow-[var(--shadow-card)]">
        <TripInfoGrid
          origin={carpool.origin}
          destination={carpool.destination}
          departureAt={carpool.departureAt}
          seatsAvailable={carpool.seatsAvailable}
          totalSeats={carpool.totalSeats}
          status={carpool.status}
        />
      </div>

      <div className="grid gap-stack-lg lg:grid-cols-12">
        <div className="space-y-stack-md lg:col-span-8">
          {isOwner && !isLocked && joinRequests.length > 0 && (
            <div className="card border-emerald border-t-4 p-5">
              <h2 className="text-title-lg text-on-surface">Manage Requests</h2>
              <ul className="mt-4 space-y-3">
                {joinRequests.map((jr) => (
                  <li key={jr.id} className="flex items-center justify-between gap-3 text-body-md">
                    <span className="font-medium text-on-surface">{jr.displayName}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinAction(jr.id, "accept")}
                        disabled={actionLoading}
                        className="btn-emerald px-3 py-1.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleJoinAction(jr.id, "reject")}
                        disabled={actionLoading}
                        className="btn-secondary w-auto px-3 py-1.5"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isOwner && editing && !isLocked ? (
            <form onSubmit={saveEdits} className="card border-emerald border-t-4 space-y-stack-md p-5">
              <h2 className="text-title-lg text-on-surface">Edit Route</h2>
              <LocationSelect
                id="my-trip-origin"
                label="Starting point"
                value={originId}
                onChange={setOriginId}
                locations={locations}
              />
              <LocationSelect
                id="my-trip-destination"
                label="Ending point"
                value={destinationId}
                onChange={setDestinationId}
                locations={locations}
                excludeId={originId}
              />
              <div>
                <label className="label-field">Departure date & time</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-field">Total seats</label>
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
                <label className="label-field">Notes (optional)</label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={actionLoading || originId === destinationId}>
                  {actionLoading ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            carpool.notes && (
              <div className="card bg-surface-muted p-5">
                <p className="label-field">Notes</p>
                <p className="text-body-md text-on-surface">{carpool.notes}</p>
              </div>
            )
          )}

          <DiscussionPanel carpoolId={carpool.id} isMember={isMember} />
        </div>

        <div className="space-y-stack-md lg:col-span-4">
          <div
            className={`card p-5 ${isOwner ? "border-emerald border-t-4" : "border-navy border-t-4"}`}
          >
            <h2 className="text-title-lg text-on-surface">Trip Actions</h2>

            <div className="mt-6 space-y-2">
              {isOwner && (
                <>
                  {!isLocked && (
                    <>
                      <button
                        onClick={() => setEditing(!editing)}
                        className="btn-secondary"
                        disabled={actionLoading}
                      >
                        {editing ? "Close Editor" : "Edit Route"}
                      </button>
                      <button onClick={lockCarpool} className="btn-primary" disabled={actionLoading}>
                        Lock Carpool
                      </button>
                    </>
                  )}
                  {isLocked && (
                    <button onClick={unlockCarpool} className="btn-secondary" disabled={actionLoading}>
                      Unlock Carpool
                    </button>
                  )}
                  <button
                    onClick={cancelTrip}
                    className="w-full rounded-lg border border-error/30 px-4 py-2.5 text-body-md text-error transition-colors hover:bg-error-container"
                    disabled={actionLoading}
                  >
                    Cancel Carpool
                  </button>
                </>
              )}
              {isMember && !isOwner && (
                <button onClick={leaveTrip} className="btn-secondary" disabled={actionLoading}>
                  Leave Carpool
                </button>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-title-lg text-on-surface">Members</h2>
            <ul className="mt-4 space-y-3">
              {(carpool.members ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-label-md font-medium text-on-variant">
                      {(m.displayName ?? "?")[0]?.toUpperCase()}
                    </div>
                    <span className="text-body-md text-on-surface">{m.displayName}</span>
                  </div>
                  <span className={m.role === "OWNER" ? "badge-owner" : "badge-member"}>
                    {m.role === "OWNER" ? "Owner" : "Member"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-body-md text-error">{error}</p>}
    </AppShell>
  );
}

function TripSelectCard({
  trip,
  selected,
  badge,
  footer,
  onSelect,
}: {
  trip: CarpoolDetail;
  selected: boolean;
  badge: "Owner" | "Member";
  footer: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border bg-white p-4 text-left shadow-[var(--shadow-card)] transition-colors ${
        selected
          ? "border-emerald ring-2 ring-emerald/20"
          : "border-border hover:border-emerald/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-md font-medium tracking-wide text-on-variant">
            {formatRideDate(trip.departureAt)}
          </p>
          <p className="mt-1 text-xl font-semibold text-on-surface">
            {formatRideTime(trip.departureAt)}
          </p>
        </div>
        <span className={badge === "Owner" ? "badge-owner" : "badge-member"}>{badge}</span>
      </div>
      <div className="mt-4">
        <RouteDisplay origin={trip.origin} destination={trip.destination} compact />
      </div>
      <p className="mt-4 border-t border-border/60 pt-3 text-body-md text-on-variant">{footer}</p>
    </button>
  );
}
