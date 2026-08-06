"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/MainNav";
import { CabContactCard } from "@/components/mobility/CabContactCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <AppShell>
      <PageHeader
        title="Cab Services"
        subtitle="Local taxi and self-drive contacts near GIM — directory only."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAB_SERVICES.map((service) => (
          <CabContactCard key={service.id} contact={service} />
        ))}
      </div>
    </AppShell>
  );
}
