"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/MainNav";
import { DiscussionPanel } from "@/components/DiscussionPanel";
import { TripInfoGrid } from "@/components/TripInfoGrid";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";
import { isSameCalendarDay } from "@/lib/format";

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
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
  status: string;
  isLocked: boolean;
  notes: string | null;
  ownerId: string;
  joinCutoffAt: string;
  members: Member[];
};

type ViewRole = "owner" | "member" | "requester" | "visitor";

function borderClass(role: ViewRole) {
  switch (role) {
    case "owner":
      return "border-emerald border-t-4";
    case "member":
      return "border-navy border-t-4";
    case "requester":
      return "border-amber-accent border-t-4";
    default:
      return "border-border";
  }
}

export default function CarpoolDetailPage() {
  return (
    <AuthGuard>
      <DetailContent />
    </AuthGuard>
  );
}

function DetailContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [carpool, setCarpool] = useState<CarpoolDetail | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<string | null>(null);
  const [hasTripSameDay, setHasTripSameDay] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = user?.id === carpool?.ownerId;
  const myMembership = carpool?.members?.find((m) => m.userId === user?.id);
  const isMember = Boolean(myMembership);

  const viewRole: ViewRole = isOwner
    ? "owner"
    : isMember
      ? "member"
      : myRequest === "PENDING"
        ? "requester"
        : "visitor";

  function reload() {
    if (!params.id) return;
    apiFetch<CarpoolDetail>(`/api/v1/carpools/${params.id}`)
      .then((data) => {
        setCarpool({ ...data, members: data.members ?? [] });
        if (user?.id === data.ownerId) {
          apiFetch<{ joinRequests: JoinRequest[] }>(`/api/v1/carpools/${params.id}/join-requests`)
            .then((d) => setJoinRequests(d.joinRequests.filter((j) => j.status === "PENDING")))
            .catch(() => undefined);
        } else {
          setJoinRequests([]);
        }

        if (
          user &&
          user.id !== data.ownerId &&
          !data.members?.some((member) => member.userId === user.id)
        ) {
          apiFetch<{ status: string | null }>(`/api/v1/carpools/${params.id}/my-join-request`)
            .then((d) => setMyRequest(d.status))
            .catch(() => setMyRequest(null));
        } else {
          setMyRequest(null);
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    reload();
  }, [params.id, user?.id]);

  useEffect(() => {
    if (!user || !carpool) {
      setHasTripSameDay(false);
      return;
    }

    apiFetch<{
      carpools: Array<{ id: string; departureAt: string; status: string }>;
    }>("/api/v1/carpools/mine/active")
      .then((data) => {
        const conflict = (data.carpools ?? []).some(
          (trip) =>
            trip.id !== carpool.id &&
            (trip.status === "OPEN" || trip.status === "LOCKED") &&
            isSameCalendarDay(trip.departureAt, carpool.departureAt)
        );
        setHasTripSameDay(conflict);
      })
      .catch(() => setHasTripSameDay(false));
  }, [user, carpool]);

  async function requestJoin() {
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${params.id}/join-requests`, { method: "POST", body: "{}" });
      setMyRequest("PENDING");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinAction(id: string, action: "accept" | "reject") {
    await apiFetch(`/api/v1/join-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    reload();
  }

  if (!carpool) {
    return (
      <AppShell>
        <p className="py-12 text-center text-body-md text-on-variant">Loading…</p>
      </AppShell>
    );
  }

  const cutoffPassed = new Date() >= new Date(carpool.joinCutoffAt);
  const canJoin =
    !isMember &&
    !isOwner &&
    carpool.status === "OPEN" &&
    !carpool.isLocked &&
    carpool.seatsAvailable > 0 &&
    !cutoffPassed &&
    !hasTripSameDay &&
    myRequest !== "PENDING";

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/carpools" className="text-body-md text-on-variant transition-colors hover:text-on-surface">
            ← Back to browse rides
          </Link>
          <h1 className="mt-2 text-headline-lg text-on-surface">Ride details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewRole === "requester" && <span className="badge-pending">Pending Approval</span>}
        </div>
      </div>

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
          {isOwner && carpool.status === "OPEN" && joinRequests.length > 0 && (
            <div className={`card p-5 ${borderClass("owner")}`}>
              <h2 className="text-title-lg text-on-surface">Manage Requests</h2>
              <ul className="mt-4 space-y-3">
                {joinRequests.map((jr) => (
                  <li key={jr.id} className="flex items-center justify-between gap-3 text-body-md">
                    <span className="font-medium text-on-surface">{jr.displayName}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinAction(jr.id, "accept")}
                        className="btn-emerald px-3 py-1.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleJoinAction(jr.id, "reject")}
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

          {carpool.notes && (
            <div className="card bg-surface-muted p-5">
              <p className="label-field">Notes</p>
              <p className="text-body-md text-on-surface">{carpool.notes}</p>
            </div>
          )}

          <DiscussionPanel carpoolId={carpool.id} isMember={isMember} />
        </div>

        <div className="space-y-stack-md lg:col-span-4">
          <div className={`card p-5 ${borderClass(viewRole)}`}>
            <h2 className="text-title-lg text-on-surface">Join This Trip</h2>

            <div className="mt-6 space-y-2">
              {canJoin && (
                <button onClick={requestJoin} disabled={loading} className="btn-primary">
                  {loading ? "Requesting…" : "Request to Join"}
                </button>
              )}
              {viewRole === "requester" && (
                <p className="text-body-md text-amber-accent">Join request pending owner approval</p>
              )}
              {(isOwner || isMember) && (
                <Link href={`/my-trip?trip=${carpool.id}`} className="btn-primary">
                  {isOwner ? "Manage in My Bookings" : "Go to My Bookings"}
                </Link>
              )}
              {hasTripSameDay && !isMember && (
                <p className="text-body-md text-on-variant">
                  You already have a trip on this date. You can only join one trip per day.
                </p>
              )}
              {cutoffPassed && !isMember && (
                <p className="text-body-md text-on-variant">
                  Join requests closed (30 min before departure)
                </p>
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
