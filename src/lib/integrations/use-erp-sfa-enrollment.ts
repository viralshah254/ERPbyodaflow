"use client";

import * as React from "react";
import { fetchErpSfaEnrollmentApi, type ErpSfaEnrollmentStatus } from "@/lib/api/odaflow-integration";

export function useErpSfaEnrollment() {
  const [status, setStatus] = React.useState<ErpSfaEnrollmentStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchErpSfaEnrollmentApi();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { enrolled: Boolean(status?.enrolled), status, loading, refresh };
}
