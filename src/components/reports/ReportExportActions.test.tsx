import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const save = vi.hoisted(() => vi.fn(async () => ({ id: "saved" })));
vi.mock("@/lib/api/report-snapshots", () => ({ saveReportSnapshot: save }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { ReportExportActions } from "./ReportExportActions";
describe("report export controls", () => {
  it("exports the selected full-document format without submitting filter forms", () => {
    const exportReport = vi.fn(), submit = vi.fn();
    render(<form onSubmit={submit}><ReportExportActions completeExports family="operations" reportId="stock-statement" disabled={false} params={{ dateFrom: "2026-10-01" }} onExport={exportReport} /></form>);
    fireEvent.change(screen.getByLabelText("Export format"), { target: { value: "xlsx" } });
    fireEvent.click(screen.getByRole("button", { name: "Export all rows" }));
    expect(exportReport).toHaveBeenCalledWith("xlsx"); expect(submit).not.toHaveBeenCalled();
  });
  it("saves only the applied report identity and parameters", async () => {
    render(<ReportExportActions completeExports family="manufacturing" reportId="bom-explosion" disabled={false} params={{ bomId: "recipe", quantity: "10" }} onExport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save snapshot" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("manufacturing", "bom-explosion", { bomId: "recipe", quantity: "10" }));
  });
  it("disables saving and exporting stale, pending or unavailable results", () => {
    render(<ReportExportActions completeExports family="operations" reportId="stock-statement" disabled params={null} onExport={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Export all rows" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save snapshot" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeDisabled();
  });
  it("keeps legacy backends on CSV instead of downloading JSON as a PDF", () => {
    const exportReport = vi.fn();
    render(<ReportExportActions family="operations" reportId="stock-statement" disabled={false} params={{}} onExport={exportReport} />);
    expect(screen.queryByRole("button", { name: "Save snapshot" })).toBeNull();
    expect(screen.getByLabelText("Export format")).toHaveValue("csv");
    fireEvent.click(screen.getByRole("button", { name: "Export all rows" }));
    expect(exportReport).toHaveBeenCalledWith("csv");
  });

});
