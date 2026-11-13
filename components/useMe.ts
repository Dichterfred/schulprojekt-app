"use client";

import { useEffect, useState } from "react";
import type { Me } from "@/lib/apiTypes";

/** Aktueller Nutzer aus /api/me: `undefined` = lädt noch, `null` = nicht angemeldet. */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  return me;
}
