"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function EditCarpoolRedirectPage() {
  return (
    <AuthGuard>
      <Redirect />
    </AuthGuard>
  );
}

function Redirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/my-trip");
  }, [router]);

  return null;
}
