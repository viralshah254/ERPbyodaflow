"use client";

import Link from "next/link";
import type { CopilotBlock } from "@/types/copilot";
import { Button } from "@/components/ui/button";

interface CopilotBlocksProps {
  blocks: CopilotBlock[];
  onConfirmAction?: (actionId: string, actionType: string) => void;
}

export function CopilotBlocks({ blocks, onConfirmAction }: CopilotBlocksProps) {
  return (
    <div className="mt-3 space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === "narrative") {
          return <p key={idx} className="text-sm text-muted-foreground">{block.text}</p>;
        }
        if (block.type === "kpi") {
          return (
            <div key={idx} className="rounded border bg-background p-3">
              <div className="text-xs text-muted-foreground">{block.title}</div>
              <div className="text-lg font-semibold">
                {block.value.toLocaleString()}
                {block.unit ? ` ${block.unit}` : ""}
              </div>
              {block.trend ? (
                <div className="text-xs text-muted-foreground">{block.trend.label}: {block.trend.value}</div>
              ) : null}
            </div>
          );
        }
        if (block.type === "table") {
          return (
            <div key={idx} className="rounded border bg-background p-3">
              {block.title ? <div className="mb-2 text-xs text-muted-foreground">{block.title}</div> : null}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      {block.columns.map((col) => (
                        <th key={col} className="border-b py-1 pr-3 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {block.columns.map((col) => (
                          <td key={`${rowIdx}-${col}`} className="border-b py-1 pr-3">{row[col] ?? "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        if (block.type === "chart") {
          const series = block.series[0];
          const max = Math.max(...series.points.map((p) => p.y), 1);
          return (
            <div key={idx} className="rounded border bg-background p-3">
              <div className="mb-2 text-xs text-muted-foreground">{block.title}</div>
              <div className="space-y-1">
                {series.points.slice(0, 8).map((point) => (
                  <div key={point.x} className="flex items-center gap-2 text-xs">
                    <span className="w-16 truncate">{point.x}</span>
                    <div className="h-2 flex-1 rounded bg-muted">
                      <div className="h-2 rounded bg-primary/60" style={{ width: `${Math.max(2, (point.y / max) * 100)}%` }} />
                    </div>
                    <span className="w-16 text-right">{Math.round(point.y).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (block.type === "links") {
          if (!block.items.length) {
            return (
              <div key={idx} className="rounded border bg-background px-3 py-2 text-xs text-muted-foreground">
                No related links found.
              </div>
            );
          }
          return (
            <div key={idx} className="space-y-1">
              {block.title ? <div className="text-xs text-muted-foreground">{block.title}</div> : null}
              {block.items.map((item) => (
                <Link key={item.href + item.label} href={item.href} className="block rounded border bg-background px-3 py-2 text-xs hover:bg-accent/50">
                  {item.label}
                </Link>
              ))}
            </div>
          );
        }
        if (block.type === "proposed_action") {
          return (
            <div key={idx} className="rounded border bg-background p-3">
              <div className="text-sm font-medium">{block.summary}</div>
              <div className="mt-1 text-xs text-muted-foreground">Action: {block.actionType}</div>
              <Button className="mt-2 h-7" size="sm" onClick={() => onConfirmAction?.(block.actionId, block.actionType)}>
                Confirm action
              </Button>
            </div>
          );
        }
        return (
          <div key={idx} className="rounded border bg-background p-2 text-xs">
            {block.message}
          </div>
        );
      })}
    </div>
  );
}
