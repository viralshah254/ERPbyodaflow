/** Document line amounts are gross for both inclusive and exclusive unit prices. */
export function repriceDocumentLineTax(netUnitPrice: number, quantity: number, rate: number, inclusive: boolean): { amount: number; tax: number } {
  if (![netUnitPrice, quantity, rate].every(Number.isFinite) || rate < 0 || rate > 100) throw new Error("Cannot reprice a line with invalid price, quantity or tax rate.");
  const round = (value: number) => Math.round(value * 100) / 100;
  const basis = round(netUnitPrice * quantity);
  const tax = inclusive ? round(basis * rate / (100 + rate)) : round(basis * rate / 100);
  return { amount: inclusive ? basis : round(basis + tax), tax };
}
