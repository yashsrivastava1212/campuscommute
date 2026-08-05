"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppHeader } from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

type Listing = {
  id: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  pricePerSeatInr: number;
  vehicleType: string;
};

export default function TransportPage() {
  return (
    <AuthGuard>
      <TransportContent />
    </AuthGuard>
  );
}

function TransportContent() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    apiFetch<{ listings: Listing[] }>("/api/v1/transport").then((d) => setListings(d.listings));
  }, []);

  async function book(id: string) {
    await apiFetch(`/api/v1/transport/${id}/book`, { method: "POST", body: "{}" });
    alert("Booking request submitted!");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader backHref="/dashboard" />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-semibold">Transport Listings</h1>
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-medium">{l.destination}</p>
              <p className="text-sm text-slate-500">
                {new Date(l.departureAt).toLocaleString()} · {l.vehicleType}
              </p>
              <p className="text-sm text-brand-700">
                ₹{l.pricePerSeatInr}/seat · {l.seatsAvailable} left
              </p>
              <button onClick={() => book(l.id)} className="mt-2 text-sm text-brand-600 hover:underline">
                Request seat
              </button>
            </li>
          ))}
        </ul>
        {listings.length === 0 && (
          <p className="text-center text-sm text-slate-500">No transport listings available.</p>
        )}
      </div>
    </main>
  );
}
