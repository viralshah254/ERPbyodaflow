import { expect, it } from "vitest";
import { customerDeliveryAddressText, isCustomerDeliveryDoc } from "./customer-delivery-address";

it("joins the street address and skips a country-only record", () => {
  expect(customerDeliveryAddressText({
    line1: "Jogoo Road",
    city: "Nairobi",
    country: "Kenya",
  })).toBe("Jogoo Road, Nairobi");
  expect(customerDeliveryAddressText({ country: "KE" })).toBe("");
  expect(customerDeliveryAddressText(null)).toBe("");
});

it("covers sales orders, invoices, and credit notes", () => {
  expect(isCustomerDeliveryDoc("sales-order")).toBe(true);
  expect(isCustomerDeliveryDoc("invoice")).toBe(true);
  expect(isCustomerDeliveryDoc("credit-note")).toBe(true);
  expect(isCustomerDeliveryDoc("delivery-note")).toBe(false);
});
