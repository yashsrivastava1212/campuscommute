"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

/** Keeps Mixpanel distinct_id in sync with the logged-in user UUID. */
export function MixpanelAuthSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.id) {
      identifyUser(user.id);
    } else {
      resetAnalytics();
    }
  }, [user?.id, isLoading]);

  return null;
}
