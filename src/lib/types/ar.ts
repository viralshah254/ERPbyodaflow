export type OpenInvoiceRow = {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  total: number;
  allocated: number;
  outstanding: number;
  dueDate: string;
  status: string;
  currency?: string;
};

export type PaymentRow = {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
};
