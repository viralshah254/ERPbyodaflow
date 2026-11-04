"use client";
import * as React from "react";
import Link from "next/link";
import { fetchTrustedDevices, type DeviceReading, type TrustedDevice } from "@/lib/api/production-controls";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck } from "lucide-react";
export function DeviceReadingPicker({ workOrderId, value, onChange }: { workOrderId: string; value: string; onChange: (id: string, quantity?: number) => void }) {
  const [readings, setReadings] = React.useState<DeviceReading[]>([]);
  const [devices, setDevices] = React.useState<TrustedDevice[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const generation = React.useRef(0);
  const callback = React.useRef(onChange); callback.current = onChange;
  const invalidate = React.useCallback(() => { generation.current++; }, []);
  const load = React.useCallback(async () => {
    const request = ++generation.current; setLoading(true); setError("");
    try {
      const next = await fetchTrustedDevices(workOrderId); if (request !== generation.current) return;
      setDevices(next.devices);
      const approved = next.readings.filter((r) => r.state === "APPROVED" && next.devices.some((d) => d._id === r.deviceId && d.active && new Date(d.calibrationValidUntil).getTime() >= Date.now() && Date.now() - new Date(r.capturedAt).getTime() <= d.maxAgeSeconds * 1000));
      setReadings(approved);
      if (!approved.some((r) => r._id === value)) callback.current("", undefined);
    } catch (e) { if (request === generation.current) { setError((e as Error).message); callback.current("", undefined); } }
    finally { if (request === generation.current) setLoading(false); }
  }, [workOrderId, value]);
  React.useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  return <div className="space-y-2 rounded-xl border bg-primary/5 p-3 sm:col-span-3"><div className="flex items-center justify-between gap-3"><label htmlFor="approved-reading" className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary"/>Approved scale evidence</label><Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => void load()}><RefreshCw className="mr-2 size-3"/>Refresh</Button></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <select id="approved-reading" className="w-full rounded-md border bg-background p-2 text-sm" value={value} disabled={loading} onChange={(e) => { const reading = readings.find((r) => r._id === e.target.value); onChange(reading?._id ?? "", reading?.quantity); }}><option value="">{loading ? "Loading verified readings…" : readings.length ? "Choose a reviewed measurement" : "No approved, current readings for this batch"}</option>{readings.map((r) => <option value={r._id} key={r._id}>{devices.find((d) => d._id === r.deviceId)?.name ?? r.deviceId} · {r.quantity} {r.unit} · {new Date(r.capturedAt).toLocaleString()}</option>)}</select>}
    <p className="text-xs text-muted-foreground">Weight is copied from signed evidence and cannot be overwritten. <Link href="/manufacturing/trusted-devices" className="font-medium text-primary underline underline-offset-2">Review device readings</Link></p>
  </div>;
}
