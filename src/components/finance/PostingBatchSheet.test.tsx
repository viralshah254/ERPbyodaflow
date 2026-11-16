import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { fetchPostingBatchBySourceApi, fetchPostingBatchDetailApi } from "@/lib/api/finance";
import { PostingBatchSheet } from "./PostingBatchSheet";

vi.mock("@/lib/api/finance", () => ({
  fetchPostingBatchBySourceApi: vi.fn(),
  fetchPostingBatchDetailApi: vi.fn(),
}));

afterEach(cleanup);

it("links to the original invoice when the posting batch was opened from a journal", async () => {
  const batch = {
    id: "batch-1",
    sourceType: "invoice",
    sourceId: "invoice-1",
    sourceNumber: "INV0013",
    journalDocumentId: "journal-1",
    postingDate: "2026-11-16",
    currency: "KES",
  };
  vi.mocked(fetchPostingBatchBySourceApi).mockResolvedValue(batch);
  vi.mocked(fetchPostingBatchDetailApi).mockResolvedValue({
    ...batch,
    lines: [],
    totals: { debit: 0, credit: 0 },
  });

  render(<PostingBatchSheet open onOpenChange={() => {}} sourceType="journal" sourceId="journal-1" />);

  expect(await screen.findByRole("link", { name: "INV0013" })).toHaveAttribute("href", "/docs/invoice/invoice-1");
  expect(fetchPostingBatchBySourceApi).toHaveBeenCalledWith("journal", "journal-1");
});
