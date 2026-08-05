"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MainNav } from "@/components/MainNav";
import { DiscussionPanel } from "@/components/DiscussionPanel";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";

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

type CostSplit = {
  perPersonInr: number;
  savingsInr: number;
  memberCount: number;
};

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
  const [costSplit, setCostSplit] = useState<CostSplit | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = user?.id === carpool?.ownerId;
  const myMembership = carpool?.members.find((m) => m.userId === user?.id);
  const isMember = Boolean(myMembership);

  function reload() {
    if (!params.id) return;
    apiFetch<CarpoolDetail>(`/api/v1/carpools/${params.id}`).then(setCarpool).catch(() => undefined);
    if (isOwner) {
      apiFetch<{ joinRequests: JoinRequest[] }>(`/api/v1/carpools/${params.id}/join-requests`)
        .then((d) => setJoinRequests(d.joinRequests.filter((j) => j.status === "PENDING")))
        .catch(() => undefined);
    }
    apiFetch<CostSplit>(`/api/v1/carpools/${params.id}/cost-split`).then(setCostSplit).catch(() => undefined);
  }

  useEffect(() => {
    reload();
  }, [params.id, user?.id, isOwner, isMember]);

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

  async function lockCarpool() {
    await apiFetch(`/api/v1/carpools/${params.id}/lock`, { method: "POST", body: "{}" });
    reload();
  }

  if (!carpool) return <p className="p-8 text-center text-slate-500">Loading…</p>;

  const cutoffPassed = new Date() >= new Date(carpool.joinCutoffAt);
  const canJoin =
    !isMember &&
    !isOwner &&
    carpool.status === "OPEN" &&
    !carpool.isLocked &&
    carpool.seatsAvailable > 0 &&
    !cutoffPassed &&
    !user?.activeCarpoolId;

  return (
    <main className="min-h-screen bg-slate-50">
      <MainNav />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {carpool.origin} → {carpool.destination}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{new Date(carpool.departureAt).toLocaleString()}</p>
          <p className="mt-2 text-sm text-brand-700">
            {carpool.seatsAvailable} of {carpool.totalSeats} seats available · {carpool.status}
          </p>
          {costSplit && (
            <p className="mt-2 text-sm text-green-700">
              Est. ₹{costSplit.perPersonInr}/person · Save ₹{costSplit.savingsInr} vs solo taxi
            </p>
          )}
          {carpool.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{carpool.notes}</p>}
        </div>

        {canJoin && (
          <button onClick={requestJoin} disabled={loading} className="btn-primary">
            {loading ? "Requesting…" : "Request to Join"}
          </button>
        )}
        {myRequest === "PENDING" && (
          <p className="text-sm text-amber-600">Join request pending owner approval</p>
        )}
        {cutoffPassed && !isMember && (
          <p className="text-sm text-slate-500">Join requests closed (30 min before departure)</p>
        )}

        {isOwner && carpool.status === "OPEN" && (
          <div className="space-y-3">
            <button onClick={lockCarpool} className="btn-primary">
              Lock Carpool
            </button>
            {joinRequests.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-700">Join Requests</h2>
                <ul className="mt-2 space-y-2">
                  {joinRequests.map((jr) => (
                    <li key={jr.id} className="flex items-center justify-between text-sm">
                      <span>{jr.displayName ?? "Student"}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleJoinAction(jr.id, "accept")}
                          className="rounded-lg bg-green-600 px-3 py-1 text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleJoinAction(jr.id, "reject")}
                          className="rounded-lg bg-slate-200 px-3 py-1"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Members</h2>
          <ul className="mt-2 space-y-1">
            {carpool.members.map((m) => (
              <li key={m.id} className="flex justify-between text-sm">
                <span>{m.displayName ?? "Student"}</span>
                <span className="text-slate-400">{m.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <DiscussionPanel carpoolId={carpool.id} isMember={isMember} />

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
