import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/production-controls", () => ({ fetchTrustedDevices: mock.fetch }));
import { DeviceReadingPicker } from "./device-reading-picker";
afterEach(cleanup);
describe("verified device evidence picker", () => {
  it("shows only approved readings from an active calibrated device and copies exact weight", async () => {
    const onChange = vi.fn(); const now = new Date().toISOString();
    mock.fetch.mockResolvedValue({ devices: [{ _id: "scale", name: "Packing scale", active: true, calibrationValidUntil: "2030-01-01", maxAgeSeconds: 3600 }], readings: [{ _id: "approved", deviceId: "scale", state: "APPROVED", quantity: 12.5, unit: "KG", capturedAt: now }, { _id: "pending", deviceId: "scale", state: "PENDING", quantity: 99, unit: "KG", capturedAt: now }] });
    render(<DeviceReadingPicker workOrderId="wo" value="" onChange={onChange}/>);
    await screen.findByRole("option", { name: /Packing scale · 12.5 KG/ });
    expect(screen.queryByRole("option", { name: /99/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Approved scale evidence"), { target: { value: "approved" } });
    expect(onChange).toHaveBeenCalledWith("approved", 12.5);
  });
  it("clears the selected reading and fails closed when evidence cannot load", async () => {
    mock.fetch.mockRejectedValue(new Error("Evidence unavailable")); const onChange = vi.fn();
    render(<DeviceReadingPicker workOrderId="wo" value="old" onChange={onChange}/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Evidence unavailable");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("", undefined));
  });
});
