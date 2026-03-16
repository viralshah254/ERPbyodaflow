export interface KenyaVatRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  kind: "standard" | "zero" | "exempt";
}

export interface KenyaWhtCode {
  id: string;
  code: string;
  name: string;
  rate: number;
}

export interface KenyaTaxProfile {
  vatRegistered: boolean;
  vatPinMasked: string | null;
}

export interface TaxMapping {
  id: string;
  taxCode: string;
  mappingType: "vat_output" | "vat_input" | "wht_payable";
  coaAccountId: string;
  coaCode?: string;
  coaName?: string;
}
