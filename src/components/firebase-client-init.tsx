"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics, isFirebaseConfigured } from "@/lib/firebase";

/** Initializes Firebase Analytics once in the browser (optional). */
export function FirebaseClientInit() {
  useEffect(() => {
    if (isFirebaseConfigured()) {
      void initFirebaseAnalytics();
    }
  }, []);
  return null;
}
