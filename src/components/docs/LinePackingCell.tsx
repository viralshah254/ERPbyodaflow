/** Unit plus the LPO packing, e.g. CTN and "1 CTN * 12 PCS". */
export function LinePackingCell({ unit, packing }: { unit?: string; packing?: string }) {
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="font-mono text-xs">{unit ?? "—"}</span>
      {packing ? (
        <span className="whitespace-nowrap font-mono text-[10px] leading-tight text-muted-foreground">
          {packing}
        </span>
      ) : null}
    </span>
  );
}
