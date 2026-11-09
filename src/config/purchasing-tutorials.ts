import type { WrittenGuide } from "./tutorial-completion";
export type PurchasingGuide = WrittenGuide & { title: string };
export const REQUISITION_ITEM_GUIDE: PurchasingGuide = {
  title: "Match and manually approve requisition items",
  guideSummary: "Review each requested item, its approved quantity and supplier price before allocating the remaining requirement to draft POs.",
  guideSteps: [
    "Open Purchase Requests, create or open the requisition, then choose Review items / create purchase orders. An ERP requisition form is saved as a draft; item decisions start pending.",
    "Match each requested description to a company product using name, product code, SKU or barcode. Confirm the requested unit; configured pack conversions are frozen when the review is saved. Resolve missing conversions before approving.",
    "For each line, manually choose Approve item, Reject item or Leave pending. Enter an approved quantity no greater than the requested quantity. A matched product is not automatically approved.",
    "Review the last active supplier and price from a completed bill or receipt, including its date, unit and currency. Drafts do not establish the default. If there is no purchase history, enter supplier and price explicitly.",
    "Change supplier when required. The old supplier's price is cleared and the selected supplier's purchase history is suggested; enter a reviewed price when none exists. Check the company tax code and whether the price includes or excludes tax.",
    "Choose Save manual item review. Open the requisition document to submit it and complete the required approval. Item review does not automatically approve a PO.",
    "Return to the review, refresh status and enter Order now quantities within the approved remainder. Create draft purchase orders groups lines by supplier, currency and tax basis. Repeated retries must not create another order.",
    "Open the linked POs and review their supplier, quantities, prices and delivery information. Already ordered item decisions are frozen; unallocated pending items may be approved later.",
    "For a cancelled order, cancel or reverse its downstream receipts and bills first, then use Release cancelled PO quantities once. Review any replacement supplier before creating a new PO. Cancellation in ERP does not itself confirm cancellation with the supplier.",
  ],
  guideTips: ["Saving a requisition or creating a draft PO does not receive stock, post a supplier bill or transfer money.", "Do not create an unlinked duplicate PO after a timeout. Refresh the review and inspect the linked orders first."],
  elementHints: [
    { selector: "[data-tutorial-hint=purchase-request-item-review]", hint: "Inspect the matched product, manual decision, approved quantity, supplier, price, currency and tax for each requested line." },
    { selector: "[data-tutorial-hint=purchase-request-save-review]", hint: "Save only after reviewing the item decisions. This tour does not click Save or approve a document." },
    { selector: "[data-tutorial-hint=purchase-request-create-orders]", hint: "Create draft POs only for the approved remainder. Supplier, currency and tax basis determine the grouping." },
  ],
  recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
};
export const PURCHASE_ORDER_GUIDE: PurchasingGuide = {
  title: "Approve and send a purchase order",
  guideSummary: "Review the PO, complete its approval and email an immutable PDF through the company's verified sender, with delivery tracking.",
  guideSteps: [
    "Open a linked draft PO from the requisition review or Purchasing > Purchase orders. Check supplier, product units, quantities, price, currency, tax and delivery instructions; make permitted changes while it is a draft.",
    "Submit the PO for approval. An authorised approver can approve without sending, or use Approve & send to supplier in Supplier email delivery. Existing approval rules and maker-checker controls still apply.",
    "Before sending, check the displayed supplier, To address, verified company From address and printable PO PDF. Confirm the review checkbox. An already approved PO offers Send to supplier.",
    "If the company sender is not verified, open Settings > Company email and complete its account and DNS setup. Add the supplier's email to the supplier record if it is missing.",
    "Approve & send queues the frozen PDF only when approval succeeds. If the recipient, sender or PO changes after review, refresh delivery status and review again. Sending does not receive stock, post a bill or pay the supplier.",
    "Refresh delivery status. Queued waits for the worker; Accepted by provider is not confirmed delivery. Delivered or Bounced requires signed SendGrid events. Failed needs review of settings or source data.",
    "For Unknown, check SendGrid activity before any resend: the provider may already have accepted the message. Do not make another PO or send blindly after a timeout.",
    "For an accepted or delivered PO, an authorised user may enter a resend reason, review again and choose Resend same approved PO. It retains the original recipient and PDF, even if the supplier contact later changes.",
    "Do not send the same purchasing commitment to another supplier. Agree cancellation with the supplier and use the controlled cancellation/replacement process; retain the audit trail and linked requisition quantities.",
    "When goods arrive, create the linked GRN and record actual quantities, lots and QC. Match and post the supplier bill separately, then settle approved AP balances through finance.",
  ],
  guideTips: ["These instructions are observational: a tutorial never clicks Approve, Send, Post or Pay for you.", "Receiving and payment remain separate from PO email delivery."],
  elementHints: [{ selector: "[data-tutorial-hint=purchase-order-email]", hint: "Review the supplier, recipient and verified company sender before acknowledging the PDF. Read delivery status before deciding whether a resend is appropriate." }],
  recommendedNextStep: { label: "Goods receipts", href: "/inventory/receipts" },
};
export const COMPANY_EMAIL_GUIDE: PurchasingGuide = {
  title: "Set up company SendGrid email",
  guideSummary: "Configure a company-owned or OdaFlow-managed SendGrid sender, verify domain ownership and track approved PO delivery.",
  guideSteps: [
    "A company administrator opens Settings > Company email. Check the active company before entering sender or account details; this setup is for purchase-order emails.",
    "Choose Company-owned SendGrid or OdaFlow-managed SendGrid. For a company-owned account, enter its API key with Mail Send and domain-authentication read access. The server must have integration-secret encryption configured. Keys are encrypted and never returned to the form; leave the key blank to retain a saved key.",
    "For managed sending, the OdaFlow operator authenticates the company's domain in the managed account. No platform API key is shown to the company, and the company must still prove DNS ownership.",
    "Enter the company sender name, From email and Reply-To address. Save sender settings. Saving changes disables sending until verification succeeds again.",
    "In the selected SendGrid account, open Settings > Sender Authentication, authenticate the exact From domain and install SendGrid's DNS records with the authorised DNS administrator.",
    "Also install the ERP company ownership TXT record shown on this page: use the exact displayed name and value. Each company has its own ownership proof; do not copy another company's sender or DNS token.",
    "After DNS propagation, choose Verify domain and enable sending. Both ownership proof and the authenticated SendGrid domain must pass. Resolve credentials, permissions or DNS errors rather than bypassing verification.",
    "Optionally configure the signed Event Webhook using the displayed callback URL and its public verification key, with Delivered, Bounce and Dropped events. A managed parent account can use the shared callback. Without events, Accepted by provider must not be described as Delivered.",
    "Return to an approved test PO, review its intended recipient and PDF, and have the authorised operator perform a controlled delivery test. Company email setup does not itself send any supplier email.",
  ],
  guideTips: ["Never paste API keys into chat, requisition notes or screenshots. An Event Webhook public verification key is different from a SendGrid API key.", "This setting configures PO sending; it does not automatically change invoice or notification email channels."],
  elementHints: [
    { selector: "[data-tutorial-hint=company-email-sender]", hint: "Review this company's account mode and sender. The saved API key is never displayed; the tour does not enter or transmit credentials." },
    { selector: "[data-tutorial-hint=company-email-domain]", hint: "Install both SendGrid authentication records and the exact company ownership TXT record, then verify. This tutorial does not enable sending for you." },
  ],
  recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
};
export const REQUISITION_TO_PO_WORKFLOW = {
  key: "request-approve-po-email", label: "Request, approve and email a purchase order", href: "/purchasing/requests",
  requiresPermissions: ["purchase.read"], requiresModule: "purchasing",
  guideSummary: "Follow requisition intake through manual item approval, last-supplier pricing, grouped draft POs and tracked supplier email.",
  guideSteps: [
    ...REQUISITION_ITEM_GUIDE.guideSteps,
    "An authorised administrator completes Settings > Company email: choose company-owned or managed SendGrid, save the sender, install SendGrid DNS plus the company ownership TXT record, and verify. Signed events distinguish Accepted from Delivered.",
    ...PURCHASE_ORDER_GUIDE.guideSteps.slice(1, 9),
  ],
  guideTips: ["Match, manually approve, save review, approve requisition, create draft POs, then approve and send each PO. These are distinct actions.", "No history means manual supplier/price entry. Unknown email outcome means check provider activity before retrying.", "Opening this guide never approves an item, creates a PO, sends email, posts stock or transfers money."],
  recommendedNextStep: { label: "Company email setup", href: "/settings/company-email" },
};
export function purchasingGuideForRoute(path: string): PurchasingGuide | undefined {
  if (/^\/purchasing\/requests\/[^/]+\/review$/.test(path)) return REQUISITION_ITEM_GUIDE;
  if (/^\/docs\/purchase-order\/[^/]+$/.test(path) && !path.endsWith("/new")) return PURCHASE_ORDER_GUIDE;
  if (path === "/settings/company-email") return COMPANY_EMAIL_GUIDE;
  if (path === "/purchasing/requests") return REQUISITION_ITEM_GUIDE;
  if (path === "/purchasing/orders" || path === "/docs/purchase-order") return PURCHASE_ORDER_GUIDE;
}
