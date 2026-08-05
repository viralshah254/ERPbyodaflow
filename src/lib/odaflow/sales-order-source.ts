import type { DocumentDetailRecord } from "@/lib/types/documents";
import type { OdaflowSourceInfo } from "@/components/integrations/OdaflowSourceCard";

/** Document fields used to detect and display Odaflow SFA origin. */
export type OdaflowSalesOrderFields = {
  externalSource?: string;
  orderChannel?: string;
  externalOrderId?: string;
  odaflowChannel?: string;
  odaflowOrderTitle?: string;
  odaflowSalesRepName?: string;
  odaflowSalesRepPhone?: string;
  odaflowSourcePdfUrl?: string;
  odaflowCustomerName?: string;
};

export function isOdaflowSalesOrder(doc: OdaflowSalesOrderFields | null | undefined): boolean {
  if (!doc) return false;
  if (doc.externalSource === "odaflow") return true;
  if (String(doc.orderChannel ?? "").trim().toUpperCase() === "ODAFLOW") return true;
  return false;
}

export function odaflowSourceFromDocument(
  doc: OdaflowSalesOrderFields | null | undefined
): OdaflowSourceInfo | null {
  if (!isOdaflowSalesOrder(doc) || !doc) return null;
  return {
    orderTitle: doc.odaflowOrderTitle,
    odaflowChannel: doc.odaflowChannel,
    sfaCustomerName: doc.odaflowCustomerName,
    salesRepName: doc.odaflowSalesRepName,
    salesRepPhone: doc.odaflowSalesRepPhone,
    sourcePdfUrl: doc.odaflowSourcePdfUrl,
    externalOrderId: doc.externalOrderId,
  };
}

export function odaflowSourceFromDetail(doc: DocumentDetailRecord | null | undefined): OdaflowSourceInfo | null {
  return odaflowSourceFromDocument(doc ?? undefined);
}
