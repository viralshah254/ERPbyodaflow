import { Badge } from "@/components/ui/badge";
import {
  deliveryLineBarcode,
  deliveryLinePrimaryLabel,
  deliveryLineSize,
  deliveryLineSku,
  type DeliveryLineLabelInput,
} from "@/lib/documents/format-delivery-line";
import { cn } from "@/lib/utils";

type DocumentLineProductDescriptionProps = {
  line: DeliveryLineLabelInput;
  fmcgOrg?: boolean;
  nameClassName?: string;
};

export function DocumentLineProductDescription({
  line,
  fmcgOrg = false,
  nameClassName,
}: DocumentLineProductDescriptionProps) {
  const name = deliveryLinePrimaryLabel(line);

  if (fmcgOrg) {
    const sizeLabel = deliveryLineSize(line);
    const barcode = deliveryLineBarcode(line);

    return (
      <div className="relative min-w-0">
        {sizeLabel ? (
          <Badge
            variant="secondary"
            className="absolute right-0 top-0 px-1.5 py-0 text-[10px] font-normal"
          >
            {sizeLabel}
          </Badge>
        ) : null}
        <span className={cn("block", sizeLabel ? "pr-14" : "", nameClassName)}>{name}</span>
        {barcode ? (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{barcode}</p>
        ) : null}
      </div>
    );
  }

  const sku = deliveryLineSku(line);

  return (
    <>
      <span className={nameClassName}>{name}</span>
      {sku ? <p className="truncate font-mono text-xs text-muted-foreground">{sku}</p> : null}
    </>
  );
}
