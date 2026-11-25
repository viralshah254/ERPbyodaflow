import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import WarehouseTransfersPage from "./page";
import { fetchTransferHistory } from "@/lib/api/warehouse-transfers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ actions }: { actions: React.ReactNode }) => <header>{actions}</header> }));
vi.mock("@/components/layout/page-shell", () => ({ LIST_PAGE_SHELL_CLASS: "", LIST_PAGE_BODY_CLASS: "", LIST_TABLE_SURFACE_CLASS: "", PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/copilot/ExplainThis", () => ({ ExplainThis: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => true }));
vi.mock("@/lib/api/warehouse-transfers", () => ({ fetchTransferHistory: vi.fn(), exportTransfersCsv: vi.fn(), updateTransferStatus: vi.fn() }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: vi.fn().mockResolvedValue([{ id: "prd", label: "PRD - Production" }, { id: "c4", label: "C4 - Monday route" }]) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/ui/async-searchable-select", () => ({
  AsyncSearchableSelect: ({ id, value, onValueChange, loadOptions, reloadToken }: {
    id?: string; value?: string; onValueChange: (id: string) => void; reloadToken?: unknown;
    loadOptions: (query: string) => Promise<Array<{ id: string; label: string }>>;
  }) => {
    const [options, setOptions] = React.useState<Array<{ id: string; label: string }>>([]);
    React.useEffect(() => {
      void loadOptions("").then(setOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadToken]);
    return <select id={id} value={value ?? ""} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">All stores</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>;
  },
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const transfer = {
  id: "t-1", number: "TRF-0009", date: "2026-11-24", status: "RECEIVED" as const, createdBy: "Jane Wanjiku",
  fromWarehouseId: "prd", fromWarehouse: "Production", toWarehouseId: "c4", toWarehouse: "Monday route",
  lines: [
    { id: "l1", sku: "J001", productName: "Choco muffin", quantity: 24, unit: "EA" },
    { id: "l2", sku: "R002", productName: "Plain muffin", quantity: 12, unit: "EA" },
  ],
};

it("filters history by store and direction, and keeps the filter in the link", async () => {
  vi.mocked(fetchTransferHistory).mockResolvedValue({ items: [transfer], hasMore: false });
  window.history.replaceState(null, "", "/warehouse/transfers?warehouse=c4");
  render(<WarehouseTransfersPage />);
  await waitFor(() => expect(fetchTransferHistory).toHaveBeenLastCalledWith(expect.objectContaining({ warehouseId: "c4" })));
  expect(await screen.findByText("Choco muffin")).toBeInTheDocument();
  expect(screen.getByText("+1 more product")).toBeInTheDocument();
  expect(screen.getByText("Jane Wanjiku")).toBeInTheDocument();
  expect(screen.getByText("24th Nov 2026")).toBeInTheDocument();
  expect(screen.queryByText("2026-11-24")).toBeNull();
  expect(screen.getByText(/0 sent out · 1 received/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Sent out" }));
  await waitFor(() => expect(fetchTransferHistory).toHaveBeenLastCalledWith(expect.objectContaining({ warehouseId: "c4", direction: "out" })));
  expect(window.location.search).toBe("?warehouse=c4&direction=out");

  fireEvent.change(await screen.findByLabelText("Store"), { target: { value: "" } });
  await waitFor(() => expect(fetchTransferHistory).toHaveBeenLastCalledWith(expect.objectContaining({ warehouseId: undefined, direction: undefined })));
  expect(screen.getByRole("button", { name: "Sent out" })).toBeDisabled();
  expect(window.location.search).toBe("");
});

it("loads older transfers on request", async () => {
  vi.mocked(fetchTransferHistory)
    .mockResolvedValueOnce({ items: [transfer], hasMore: true })
    .mockResolvedValueOnce({ items: [{ ...transfer, id: "t-0", number: "TRF-0008" }], hasMore: false });
  render(<WarehouseTransfersPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Load older transfers" }));
  expect(await screen.findByText("TRF-0008")).toBeInTheDocument();
  expect(fetchTransferHistory).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1 }));
  expect(screen.queryByRole("button", { name: "Load older transfers" })).toBeNull();
});
