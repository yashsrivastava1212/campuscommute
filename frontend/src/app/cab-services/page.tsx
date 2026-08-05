"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { MainNav } from "@/components/MainNav";
import { CAB_SERVICES } from "@/data/cab-services";

export default function CabServicesPage() {
  return (
    <AuthGuard>
      <CabServicesContent />
    </AuthGuard>
  );
}

function CabServicesContent() {
  return (
    <main className="min-h-screen bg-slate-50">
      <MainNav />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cab Services</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rent vehicle (taxi / self-drive) — local contacts near GIM
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-amber-100">
                <th className="px-4 py-3 font-semibold text-slate-900">Sl no</th>
                <th className="px-4 py-3 font-semibold text-slate-900">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-900">Contact</th>
              </tr>
            </thead>
            <tbody>
              {CAB_SERVICES.map((service, index) => (
                <tr
                  key={service.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {service.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {service.phones.map((phone) => (
                        <a
                          key={phone}
                          href={`tel:+91${phone}`}
                          className="text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {phone}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
