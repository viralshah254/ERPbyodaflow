/**
 * Per-page guide content: summary and optional steps for each tutorial item.
 * Keys match nav item keys. Missing keys fall back to chapter description in getTutorialForRoute.
 */

export interface ElementHint {
  selector: string;
  hint: string;
}

export const ITEM_GUIDES: Partial<
  Record<
    string,
    {
      guideSummary: string;
      guideSteps?: string[];
      guideTips?: string[];
      elementHints?: ElementHint[];
      recommendedNextStep?: { label: string; href: string };
    }
  >
> = {
  // Core
  "control-tower": {
    guideSummary:
      "The Control Tower is your command center for KPIs, exceptions, and operational visibility. View key metrics, procurement variance, yield, and franchise or cold-chain data in one place.",
    guideSteps: [
      "Review the KPI cards and exception list.",
      "Use filters or date range if available.",
      "Drill into items or open linked documents as needed.",
      "Use Ask Copilot for explanations of metrics or next steps.",
    ],
  },
  dashboard: {
    guideSummary:
      "The main dashboard shows an overview of your business: key metrics, recent activity, and quick links. Use it to see the big picture and jump to documents, approvals, or modules.",
    guideSteps: [
      "Scan KPIs and alerts at the top.",
      "Use quick links or search to open documents or lists.",
      "Open the command palette (⌘K) to search or ask Copilot.",
    ],
    guideTips: ["Press ⌘K to open command palette and jump anywhere.", "Click a KPI card to drill into detail."],
    recommendedNextStep: { label: "Documents", href: "/docs" },
  },
  approvals: {
    guideSummary:
      "Approvals is where you manage documents and requests waiting for your approval. From here you can open the Inbox (items assigned to you) or My requests (items you submitted).",
    guideSteps: [
      "Go to Inbox to approve or reject pending items.",
      "Go to My requests to see status of what you submitted.",
      "Open an item to view details and take action.",
    ],
  },
  "approvals-inbox": {
    guideSummary:
      "Inbox lists all approval requests assigned to you. Review each item, open the linked document if needed, then approve or reject with optional comments.",
    guideSteps: [
      "Open an item to see details and the source document.",
      "Approve or reject; add a comment if required.",
      "Use filters to narrow by type or date.",
    ],
  },
  "approvals-requests": {
    guideSummary:
      "My requests shows items you have submitted for approval. Track their status and open the document or request to see who approved or rejected and why.",
    guideSteps: [
      "Filter by status (pending, approved, rejected) if needed.",
      "Open a request to see history and comments.",
    ],
  },
  tasks: {
    guideSummary:
      "Tasks / Work Queue lists your assigned tasks and work items. Use it to see what needs your action and open the related record or document.",
    guideSteps: [
      "Review the list and open a task to see details.",
      "Complete or reassign as needed.",
      "Use search or filters to find specific tasks.",
    ],
  },
  // Document Center
  "docs-hub": {
    guideSummary:
      "Documents is the hub for all transaction documents: sales orders, purchase orders, goods receipts, invoices, and journal entries. Create new documents from here or open an existing one.",
    guideSteps: [
      "Choose a document type to list or create.",
      "Use search and filters to find existing documents.",
      "Click Create or New to start a new document.",
    ],
    guideTips: ["Use ⌘K and type document type to jump directly.", "Documents link to each other (e.g. SO → delivery → invoice)."],
    recommendedNextStep: { label: "Create a sales order", href: "/docs/sales-order/new" },
  },
  "docs-so": {
    guideSummary:
      "Sales Orders lists and creates customer sales orders. Each order can have lines, quantities, prices, and status. Orders drive deliveries and invoicing.",
    guideSteps: [
      "Filter or search to find an order.",
      "Open an order to view or edit lines and status.",
      "Create a new sales order and add lines, then submit.",
    ],
  },
  "docs-po": {
    guideSummary:
      "Purchase Orders lists and creates supplier purchase orders. POs are used to receive goods (GRN) and match to supplier invoices.",
    guideSteps: [
      "Search or filter to find a PO.",
      "Open a PO to view lines and status.",
      "Create a new PO, add lines, and submit for approval if required.",
    ],
  },
  "docs-grn": {
    guideSummary:
      "Goods Receipt (GRN) records receipt of goods against purchase orders. Posting a GRN updates inventory and can be matched later to the supplier invoice.",
    guideSteps: [
      "Create a GRN linked to a PO or select an open PO.",
      "Enter received quantities and any variances.",
      "Post the GRN to update stock and document history.",
    ],
  },
  "docs-invoice": {
    guideSummary:
      "Invoices lists and creates sales or purchase invoices. Invoices post to receivables or payables and affect the general ledger.",
    guideSteps: [
      "Filter by type (sales/purchase) and status.",
      "Open an invoice to view or edit; post when ready.",
      "Create a new invoice and link to an order or bill if applicable.",
    ],
  },
  "docs-journal": {
    guideSummary:
      "Journal Entries are manual accounting entries that post to the general ledger. Use them for adjustments, allocations, or any transaction not created by a document.",
    guideSteps: [
      "Create a journal entry and add debit/credit lines.",
      "Ensure total debits equal total credits.",
      "Post the entry to update the ledger.",
    ],
  },
  "docs-credit-note": {
    guideSummary:
      "Sales Credit Notes reverse revenue when customers return goods or receive credit. Create a credit note linked to an invoice to reduce receivables.",
    guideSteps: [
      "Create a credit note linked to the original sales invoice.",
      "Enter lines and amounts to credit.",
      "Post to update receivables and inventory if applicable.",
    ],
  },
  "docs-debit-note": {
    guideSummary:
      "Sales Debit Notes add charges or adjustments to customer accounts. Use them for additional fees, interest, or corrections.",
    guideSteps: [
      "Create a debit note and select the customer.",
      "Add lines for the charge or adjustment.",
      "Post to update receivables.",
    ],
  },
  "docs-purchase-credit-note": {
    guideSummary:
      "Purchase Credit Notes record credits from suppliers (returns or price adjustments). Link to the original purchase invoice to reduce payables.",
    guideSteps: [
      "Create a purchase credit note linked to the original bill.",
      "Enter lines and amounts to credit.",
      "Post to update payables and inventory if applicable.",
    ],
  },
  "docs-purchase-debit-note": {
    guideSummary:
      "Purchase Debit Notes add charges or adjustments from suppliers. Use them for additional fees, interest, or corrections to payables.",
    guideSteps: [
      "Create a purchase debit note and select the supplier.",
      "Add lines for the charge or adjustment.",
      "Post to update payables.",
    ],
  },
  // Masters
  "masters-hub": {
    guideSummary:
      "Masters is the central place for master data: products, parties (customers and suppliers), and warehouses. Set these up before creating transactions.",
    guideSteps: [
      "Open Products, Parties, or Warehouses from the list.",
      "Create or edit records as needed.",
      "Use search to find existing masters.",
    ],
  },
  "masters-products": {
    guideSummary:
      "Products lists all your products or SKUs. Each product has code, name, unit, category, and optional pricing. Products are used in documents and inventory.",
    guideSteps: [
      "Search or filter to find a product.",
      "Open a product to view or edit details, pricing, or variants.",
      "Create a new product and fill required fields.",
    ],
  },
  "masters-parties": {
    guideSummary:
      "Parties lists customers and suppliers. Each party has name, contact, and ledger or payment terms. Parties are used on sales orders, POs, and invoices.",
    guideSteps: [
      "Filter by type (customer/supplier) if needed.",
      "Open a party to view or edit details.",
      "Create a new party and set default terms.",
    ],
  },
  "masters-warehouses": {
    guideSummary:
      "Warehouses defines your storage locations. Each warehouse can have locations or bins. Stock levels and movements are tracked per warehouse.",
    guideSteps: [
      "Open a warehouse to view or edit locations.",
      "Create a new warehouse when adding a site or location.",
    ],
  },
  // Inventory
  "inventory-products": {
    guideSummary:
      "Inventory Products shows product stock and value by warehouse. Use it to see on-hand quantities, reserved amounts, and value for each SKU.",
    guideSteps: [
      "Search by SKU or product name.",
      "Filter by warehouse to see stock per location.",
      "Drill into a product or open Stock Movements for history.",
    ],
  },
  "inventory-stock-levels": {
    guideSummary:
      "Stock Levels lists current quantity and value per product and warehouse. You can see reorder levels and drill to movements or documents.",
    guideSteps: [
      "Use search and warehouse filter to narrow the list.",
      "Open a row to see details or movement history.",
      "Export to CSV if needed.",
    ],
  },
  "inventory-movements": {
    guideSummary:
      "This page lists all inventory movements (in, out, transfer, adjustment) with date, type, SKU, product, warehouse, quantity, and reference. Movements are created when you post goods receipts, deliveries, transfers, or stock adjustments.",
    guideSteps: [
      "Use the search bar to find by SKU or product name.",
      "Filter by warehouse and/or movement type using the dropdowns.",
      "Export the table to CSV with the Export button.",
      "Movements link to source documents; open a row or reference to trace back.",
    ],
    guideTips: ["Click a reference to open the source document.", "Export to CSV for offline analysis."],
    elementHints: [
      { selector: "[data-tutorial-hint=search]", hint: "Search by SKU or product name." },
      { selector: "[data-tutorial-hint=export]", hint: "Export the table to CSV." },
    ],
  },
  "inventory-receipts": {
    guideSummary:
      "Receipts (GRN) lists goods receipt documents. Each receipt is tied to a purchase order and updates stock when posted. Use this list to find or create GRNs.",
    guideSteps: [
      "Filter by status or date to find a receipt.",
      "Open a receipt to view lines and post if pending.",
      "Create a new GRN from the Create button, linked to a PO.",
    ],
  },
  "inventory-receiving": {
    guideSummary:
      "Receiving Queue shows items waiting to be received (e.g. against POs or expected deliveries). Process receipts here to update inventory.",
    guideSteps: [
      "Select a line or order to receive.",
      "Enter quantities and any variance or notes.",
      "Post the receipt to update stock.",
    ],
  },
  "inventory-costing": {
    guideSummary:
      "Costing shows inventory valuation method and lets you run or review costing (e.g. average cost, FIFO). Use it to see how product costs are calculated.",
    guideSteps: [
      "Review the costing method and parameters.",
      "Run costing if your system supports it, then review results.",
      "Check valuation reports for value by product or warehouse.",
    ],
  },
  "inventory-stock-explorer": {
    guideSummary:
      "Stock Explorer lets you drill into stock by product, warehouse, or time. Trace movements and see on-hand, reserved, and available quantities.",
    guideSteps: [
      "Search for a product or select a warehouse.",
      "View movement history and linked documents.",
      "Use filters for date range or movement type.",
    ],
  },
  "inventory-valuation": {
    guideSummary:
      "Valuation shows inventory value by product, category, or warehouse. Use it for reporting and period-end checks.",
    guideSteps: [
      "Select warehouse or category filters.",
      "Export the valuation report if needed.",
      "Compare to GL or run costing if required.",
    ],
  },
  "inventory-transfers": {
    guideSummary:
      "Transfers move stock between warehouses. Create a transfer, specify from/to warehouse and lines, then post to create movements.",
    guideSteps: [
      "Create a new transfer and select source and destination warehouses.",
      "Add product lines and quantities.",
      "Post the transfer to update both warehouses.",
    ],
  },
  "inventory-stocktake": {
    guideSummary:
      "Stocktake / Cycle Count is used to count physical inventory and reconcile with system stock. Create a count, enter counts, then post adjustments.",
    guideSteps: [
      "Create a cycle count or open an existing one.",
      "Enter counted quantities per SKU/location.",
      "Post to create adjustments and update stock.",
    ],
  },
  "inventory-warehouses": {
    guideSummary:
      "Warehouses & Locations lists warehouses and their locations or bins. Use it to manage storage structure and see capacity or usage.",
    guideSteps: [
      "Open a warehouse to view or edit locations.",
      "Add or deactivate locations as needed.",
    ],
  },
  // Warehouse
  "warehouse-overview": {
    guideSummary:
      "Warehouse Overview gives a summary of warehouse operations: pending putaway, pick tasks, and recent activity. Use it as the starting point for warehouse tasks.",
    guideSteps: [
      "Review pending tasks and open the relevant list (e.g. Putaway, Pick & Pack).",
      "Process tasks in order of priority or location.",
    ],
  },
  "warehouse-transfers": {
    guideSummary:
      "Transfers move stock between warehouses. List and create inter-warehouse transfers; post to create movements and update both locations.",
    guideSteps: [
      "Create a transfer and select from/to warehouses and lines.",
      "Post the transfer when ready.",
      "Use the list to track open and posted transfers.",
    ],
  },
  "warehouse-pick-pack": {
    guideSummary:
      "Pick & Pack lists pick tasks for orders or shipments. Complete picks to confirm items are picked and packed for delivery.",
    guideSteps: [
      "Open a pick task and view lines.",
      "Confirm quantities picked (or short) and complete the pick.",
      "Move to pack or ship as per your process.",
    ],
  },
  "warehouse-putaway": {
    guideSummary:
      "Putaway lists receipts or moves that need to be put away into locations. Assign or confirm putaway to update bin quantities.",
    guideSteps: [
      "Open a putaway task and see suggested or required locations.",
      "Enter or confirm the destination bin and quantity.",
      "Complete putaway to update location stock.",
    ],
  },
  "warehouse-bin-locations": {
    guideSummary:
      "Bin locations lists all bins or locations within warehouses. View stock per bin and manage location setup.",
    guideSteps: [
      "Filter by warehouse to see locations.",
      "Open a location to see stock or edit details.",
    ],
  },
  "warehouse-cycle-counts": {
    guideSummary:
      "Cycle counts are periodic counts used to keep inventory accurate. Create counts, enter results, and post adjustments.",
    guideSteps: [
      "Create a cycle count or open an existing one.",
      "Enter counted quantities and post to adjust stock.",
    ],
  },
  // Sales
  "sales-overview": {
    guideSummary:
      "Sales Overview shows key sales metrics and recent orders or invoices. Use it to see performance and jump to orders, deliveries, or invoices.",
    guideSteps: [
      "Review KPIs and open the Orders, Deliveries, or Invoices list as needed.",
      "Use filters or date range if available.",
    ],
  },
  "sales-quotes": {
    guideSummary:
      "Quotes lists and creates sales quotes. Quotes can be converted to orders. Use this list to track pending quotes and follow up.",
    guideSteps: [
      "Create a new quote and add lines.",
      "Send or convert to order when the customer confirms.",
      "Filter by status to see open vs converted quotes.",
    ],
  },
  "sales-orders": {
    guideSummary:
      "Orders lists sales orders. Each order can move through statuses to delivery and invoice. Use filters and search to find orders.",
    guideSteps: [
      "Search or filter by status, customer, or date.",
      "Open an order to view lines and post delivery or invoice.",
      "Create a new order and add lines, then submit.",
    ],
  },
  "sales-deliveries": {
    guideSummary:
      "Deliveries lists delivery documents or shipments. Post a delivery to reduce stock and update order status.",
    guideSteps: [
      "Open a delivery to view lines and post.",
      "Create a delivery from an order if your process requires it.",
    ],
  },
  "sales-invoices": {
    guideSummary:
      "Sales Invoices lists invoices sent to customers. Posting creates receivables and updates the ledger. Use this list to track and post invoices.",
    guideSteps: [
      "Filter by status (draft, posted) and open an invoice to view or post.",
      "Create an invoice from an order or manually.",
    ],
  },
  "sales-customers": {
    guideSummary:
      "Customers lists your customer (party) records. View contact, terms, and balance; open to edit or see linked orders and invoices.",
    guideSteps: [
      "Search or filter to find a customer.",
      "Open to view details, balance, and documents.",
    ],
  },
  "sales-returns": {
    guideSummary:
      "Returns / Credit Notes list sales returns and credit notes. Use them to reverse revenue and adjust receivables when customers return goods or get credit.",
    guideSteps: [
      "Create a return or credit note linked to an invoice or order.",
      "Post to update receivables and inventory if applicable.",
    ],
  },
  // Purchasing
  "purchasing-requests": {
    guideSummary:
      "Purchase Requests lists internal requests for purchasing. Create a request; once approved, it can be turned into a purchase order.",
    guideSteps: [
      "Create a new request and add lines.",
      "Submit for approval; track status in the list.",
      "Convert to PO when approved.",
    ],
  },
  "purchasing-orders": {
    guideSummary:
      "Purchase Orders lists POs to suppliers. Create POs, send to suppliers, and use them to receive goods and match supplier invoices.",
    guideSteps: [
      "Create a PO and add lines; submit for approval if required.",
      "Use the list to find open POs and track receipts.",
    ],
  },
  "purchasing-grn": {
    guideSummary:
      "Goods Receipt (GRN) records receipt of goods against a PO. Post a GRN to update inventory and link to the PO for three-way match.",
    guideSteps: [
      "Create a GRN from an open PO or select PO from list.",
      "Enter received quantities and post.",
    ],
  },
  "purchasing-suppliers": {
    guideSummary:
      "Suppliers lists your supplier (party) records. View terms, balance, and open POs or bills; open to edit details.",
    guideSteps: [
      "Search or filter to find a supplier.",
      "Open to view balance and linked POs/bills.",
    ],
  },
  "purchasing-supplier-invoices": {
    guideSummary:
      "Supplier Invoices (AP Bills) lists bills from suppliers. Match to PO and GRN, then post to record payables.",
    guideSteps: [
      "Create or import a bill and link to PO/GRN if needed.",
      "Post the bill to update AP and the ledger.",
    ],
  },
  "purchasing-returns": {
    guideSummary:
      "Purchase Returns list returns to suppliers and debit notes. Use them to reduce payables and adjust stock when returning goods.",
    guideSteps: [
      "Create a return linked to a PO or bill.",
      "Post to update payables and inventory.",
    ],
  },
  "purchasing-cash-weight-audit": {
    guideSummary:
      "Cash-to-Weight Audit helps reconcile weight-based procurement (e.g. perishables). Compare order weight to received weight and variance.",
    guideSteps: [
      "Select an order or date range.",
      "Review received weight and variance; post adjustments if needed.",
    ],
  },
  // Pricing
  "pricing-overview": {
    guideSummary:
      "Pricing Overview shows price lists and discount policies. Manage list prices and rules that apply to customers or channels.",
    guideSteps: [
      "Open Price Lists or Pricing Rules from the overview.",
      "Create or edit a price list and assign to customers or channels.",
    ],
  },
  "pricing-price-lists": {
    guideSummary:
      "Price Lists define selling prices per product, customer, or channel. Create lists and assign them to parties or default by channel.",
    guideSteps: [
      "Create a price list and add lines (product, price, effective date).",
      "Assign the list to customers or use as default.",
    ],
  },
  "pricing-rules": {
    guideSummary:
      "Pricing Rules define discounts, tiers, or special pricing. Rules can be based on quantity, customer, or product and override or supplement price lists.",
    guideSteps: [
      "Create a rule and set conditions (customer, product, quantity).",
      "Set the discount or price effect and priority.",
    ],
  },
  // Treasury
  "treasury-overview": {
    guideSummary:
      "Treasury Overview shows cash position, pending payments, and collections. Use it to see liquidity and open payment runs or bank accounts.",
    guideSteps: [
      "Review balances and pending items.",
      "Open Payment runs or Bank accounts as needed.",
    ],
  },
  "treasury-payment-runs": {
    guideSummary:
      "Payment runs let you batch payables and generate bank files or cheques. Create a run, select bills, and export or post payments.",
    guideSteps: [
      "Create a new payment run and select bank account and date.",
      "Add bills to pay and generate the bank file or payment list.",
      "Post the run to update AP and bank balance.",
    ],
  },
  "treasury-collections": {
    guideSummary:
      "Collections lists receivables and helps you track and record customer payments. Prioritize by overdue or amount and post receipts.",
    guideSteps: [
      "Filter by customer or overdue status.",
      "Open an invoice to apply payment or create a receipt.",
    ],
  },
  "treasury-bank-accounts": {
    guideSummary:
      "Bank accounts lists your company bank accounts and their GL mapping. Set up accounts here so payments and receipts post to the right ledger account.",
    guideSteps: [
      "Create a bank account and link to a GL account.",
      "Use the account in payment runs and when posting receipts.",
    ],
  },
  "treasury-cashflow": {
    guideSummary:
      "Cashflow shows forecasted and actual cash flow. Use it to see expected inflows and outflows and drill to source documents.",
    guideSteps: [
      "Select date range and view forecast vs actual.",
      "Drill into a line to see linked invoices or payments.",
    ],
  },
  "finance-bank-recon": {
    guideSummary:
      "Bank Reconciliation matches bank statement lines to system payments and receipts. Reconcile to keep your cash ledger in sync with the bank.",
    guideSteps: [
      "Import or enter statement lines.",
      "Match lines to payments/receipts; post reconciliation.",
    ],
  },
  // Assets
  "assets-overview": {
    guideSummary:
      "Assets Overview shows fixed assets summary and links to the register, depreciation, and disposals. Use it to see total cost and book value.",
    guideSteps: [
      "Open Asset register to add or edit assets.",
      "Open Depreciation to run periodic depreciation.",
    ],
  },
  "assets-register": {
    guideSummary:
      "Asset register lists all fixed assets with cost, depreciation method, and book value. Add new assets and link to vendor or invoice if applicable.",
    guideSteps: [
      "Create an asset and set cost, method, and useful life.",
      "Run depreciation from the Depreciation page periodically.",
    ],
  },
  "assets-depreciation": {
    guideSummary:
      "Depreciation runs periodic depreciation for fixed assets. Run for a period to post depreciation expense and update accumulated depreciation.",
    guideSteps: [
      "Select period and run depreciation.",
      "Review the journal and post to the ledger.",
    ],
  },
  "assets-disposals": {
    guideSummary:
      "Disposals records the sale or disposal of fixed assets. Post a disposal to remove the asset and record gain or loss.",
    guideSteps: [
      "Create a disposal and select the asset and disposal value.",
      "Post to update the register and post gain/loss to the ledger.",
    ],
  },
  // Manufacturing
  "manufacturing-boms": {
    guideSummary:
      "Bills of Material (BOM) define what goes into a finished product. Each BOM has components, quantities, and optional scrap. Use BOMs for production and MRP.",
    guideSteps: ["Create a BOM for a finished product.", "Add component lines with quantities.", "Use in work orders or MRP."],
  },
  "manufacturing-routing": {
    guideSummary:
      "Routing defines the steps and work centers used to produce an item. Link routing to BOMs for full production planning.",
    guideSteps: ["Define operations and work centers.", "Set times and sequence.", "Link to BOM or product."],
  },
  "manufacturing-work-orders": {
    guideSummary:
      "Work orders release production for a product and quantity. They consume components and produce finished goods; post to update stock.",
    guideSteps: ["Create a work order from a BOM.", "Issue components and report completion.", "Post to receive finished goods."],
  },
  "manufacturing-mrp": {
    guideSummary:
      "MRP (Material Requirements Planning) calculates what to order or produce based on demand and current stock. Run MRP to get suggested POs and work orders.",
    guideSteps: ["Set demand (orders or forecast).", "Run MRP and review suggestions.", "Create POs or work orders from the result."],
  },
  "manufacturing-subcontracting": {
    guideSummary:
      "Subcontracting / Job Work tracks work sent to external processors. Create subcontract orders, send materials, and receive finished or semi-finished goods.",
    guideSteps: ["Create a subcontract order.", "Issue materials and receive back.", "Post to update stock and cost."],
  },
  "manufacturing-yield": {
    guideSummary:
      "Yield / Mass balance tracks input vs output in production. Compare expected vs actual yield and track waste or byproducts.",
    guideSteps: ["Enter or import yield data.", "Compare to standard or prior runs.", "Use for costing or process improvement."],
  },
  "manufacturing-byproducts": {
    guideSummary:
      "Byproducts are secondary outputs from production. Define them on BOMs and receive them when posting work order completion.",
    guideSteps: ["Add byproduct lines to the BOM.", "Set quantity and value treatment.", "Receive with the main product on work order post."],
  },
  // Distribution
  "distribution-routes": {
    guideSummary:
      "Routes define delivery routes or territories. Use them to plan trips and assign customers or outlets to a route.",
    guideSteps: ["Create routes and add stops or customers.", "Use in trip planning or delivery runs."],
  },
  "distribution-deliveries": {
    guideSummary:
      "Deliveries lists outbound deliveries for distribution. Plan and post deliveries to update stock and link to orders.",
    guideSteps: ["Create or open a delivery.", "Add lines and confirm quantities.", "Post to update stock and order status."],
  },
  "distribution-trips": {
    guideSummary:
      "Trips / Logistics plans and tracks delivery trips. Create a trip, add orders or stops, and update status as the trip is executed.",
    guideSteps: ["Create a trip and set route and date.", "Add orders or stops.", "Update status and post deliveries."],
  },
  "distribution-transfer-planning": {
    guideSummary:
      "Transfer Planning helps plan stock transfers between locations or branches. Create transfer orders and track execution.",
    guideSteps: ["Plan transfers by source and destination.", "Create transfer orders.", "Post when goods are moved."],
  },
  "distribution-collections": {
    guideSummary:
      "Collections tracks cash or payments collected on route. Record collections against invoices or customers.",
    guideSteps: ["Select route or date.", "Enter collections and link to invoices.", "Post to update receivables."],
  },
  // Franchise
  "franchise-outlet-workspace": {
    guideSummary:
      "Outlet Workspace is the lightweight view for franchisees. See orders, stock, and key tasks for your outlet.",
    guideSteps: ["View outlet-specific data.", "Create orders or requests as allowed.", "Use Copilot for help."],
  },
  "franchise-manage-outlets": {
    guideSummary:
      "Manage franchisees lets franchisors add and manage outlet accounts. Create a new franchisee with login and link them to the network.",
    guideSteps: ["Click Add franchisee and enter name, code, and admin email.", "Set a temporary password and share with the franchisee.", "They sign in and access their outlet workspace."],
  },
  "franchise-overview": {
    guideSummary:
      "Franchise Overview shows network-level KPIs and activity across outlets. Use it to monitor performance and exceptions.",
    guideSteps: ["Review KPIs and outlet list.", "Drill into an outlet or metric as needed."],
  },
  "franchise-commission": {
    guideSummary:
      "Commission & Rebates defines and calculates commission or rebate rules for franchisees. Run commission runs and settle.",
    guideSteps: ["Set up commission rules.", "Run commission for a period.", "Review and post settlement."],
  },
  "franchise-vmi": {
    guideSummary:
      "VMI & Replenishment manages vendor-managed or automatic replenishment for outlets. Create replenishment orders from stock levels or min/max.",
    guideSteps: ["Review replenishment suggestions.", "Create orders for outlets.", "Track fulfillment."],
  },
  "franchise-comparison": {
    guideSummary:
      "Franchise Comparison compares outlets by sales, margin, or other metrics. Use it for performance review and benchmarking.",
    guideSteps: ["Select metrics and date range.", "Compare outlets in table or chart.", "Export if needed."],
  },
  // Retail
  "retail-replenishment": {
    guideSummary:
      "Replenishment suggests or creates replenishment orders for stores. Use min/max or demand to calculate what to send.",
    guideSteps: ["Review suggested replenishment.", "Create orders and send to stores."],
  },
  "retail-promotions": {
    guideSummary:
      "Promotions defines and tracks promotions (discounts, bundles). Apply to products or customers and track uplift.",
    guideSteps: ["Create a promotion and set rules.", "Apply to products or channels.", "Track redemptions and margin."],
  },
  "retail-store-performance": {
    guideSummary:
      "Store Performance shows metrics per store: sales, margin, traffic. Use it to compare stores and identify top or underperforming locations.",
    guideSteps: ["Select period and metrics.", "View by store; drill into details.", "Export for reporting."],
  },
  // Projects
  "projects-overview": {
    guideSummary:
      "Projects Overview shows all projects and their status, budget, and burn. Use it to see portfolio and drill into a project.",
    guideSteps: ["Open a project to see details and costing.", "Track timesheets and documents linked to the project."],
  },
  "projects-list": {
    guideSummary:
      "Projects lists all projects with budget, burn, and status. Create projects, assign cost centers, and link timesheets and documents.",
    guideSteps: ["Create a project and set budget.", "Link timesheets and documents to the project.", "Review burn vs budget."],
  },
  timesheets: {
    guideSummary:
      "Timesheets record time spent on projects or tasks. Enter hours and post to update project cost and payroll.",
    guideSteps: ["Enter time per project or task.", "Submit for approval if required.", "Post to update project and payroll."],
  },
  // Payroll
  "payroll-overview": {
    guideSummary:
      "Payroll Overview shows payroll summary and links to employees, pay runs, and statutories. Use it to start a pay run or check status.",
    guideSteps: ["Open Employees or Pay runs from the overview.", "Run pay for a period and post.", "Review statutories (NSSF, NHIF, PAYE)."],
  },
  "payroll-employees": {
    guideSummary:
      "Employees lists all employees with department, salary, and tax info. Add or edit employees and set up statutory deductions.",
    guideSteps: ["Create an employee and set salary and tax details.", "Assign to a branch or department.", "Use in pay runs."],
  },
  "payroll-payruns": {
    guideSummary:
      "Pay runs process payroll for a period. Create a run, calculate gross and deductions, then post to create payslips and ledger entries.",
    guideSteps: ["Create a pay run for a month and branch.", "Review payslips and statutory totals.", "Post to generate payslips and GL."],
  },
  "payroll-payslips": {
    guideSummary:
      "Payslips lists generated payslips. View or print payslips for employees after a pay run is posted.",
    guideSteps: ["Filter by pay run or employee.", "Open a payslip to view or print."],
  },
  "payroll-statutories": {
    guideSummary:
      "Statutories shows NSSF, NHIF, PAYE and other statutory settings and amounts. Configure rates and view liability per period.",
    guideSteps: ["Review statutory config and rates.", "See liability per pay run or period.", "Export for filing if needed."],
  },
  // Intercompany
  "intercompany-overview": {
    guideSummary:
      "Intercompany Overview explains how group entities trade and how consolidation and elimination work. Use it to understand IC balances and rules.",
    guideSteps: ["Review entity mapping and rules.", "Open IC Transactions to see or post entries."],
  },
  "intercompany-transactions": {
    guideSummary:
      "IC Transactions lists intercompany invoices and journal entries. Post and reconcile IC balances between entities.",
    guideSteps: ["Create IC invoice or journal.", "Match and reconcile with the other entity.", "Post elimination entries for consolidation."],
  },
  // Finance (main items)
  "finance-dashboard": {
    guideSummary:
      "Finance Dashboard shows key financial KPIs and links to GL, AR, AP, and reports. Use it as the starting point for finance tasks.",
    guideSteps: ["Review KPIs and open GL, AR, or AP as needed.", "Run reports or period close from the links."],
  },
  "finance-gl": {
    guideSummary:
      "General Ledger is the central ledger. View balances and transactions by account; drill to source documents.",
    guideSteps: ["Filter by account, period, or branch.", "Drill into a line to see the source document."],
  },
  "finance-chart-of-accounts": {
    guideSummary:
      "Chart of Accounts lists GL accounts. Use it to view the account structure; create or edit accounts in Settings if allowed.",
    guideSteps: ["Browse the tree or list.", "Open an account to see balance and transactions."],
  },
  "finance-journals": {
    guideSummary:
      "Journal Entries lists manual journal entries. Create and post journals for adjustments or allocations.",
    guideSteps: ["Create a journal and add lines.", "Post to update the ledger."],
  },
  "finance-ar": {
    guideSummary:
      "Accounts Receivable shows customer balances and open invoices. Post receipts and track ageing.",
    guideSteps: ["Filter by customer or ageing.", "Open an invoice to apply payment or create a receipt."],
  },
  "ar-customers": {
    guideSummary:
      "AR Customers lists customers with receivable balances. Open a customer to see invoices and payment history.",
    guideSteps: ["Search or filter to find a customer.", "Open to view balance and documents."],
  },
  "ar-payments": {
    guideSummary:
      "AR Payments lists receipts and payments applied to receivables. Create a receipt to record customer payment.",
    guideSteps: ["Create a receipt and select customer and invoices.", "Post to update AR and bank."],
  },
  "finance-ap": {
    guideSummary:
      "Accounts Payable shows supplier balances and open bills. Pay bills via payment runs and track ageing.",
    guideSteps: ["Filter by supplier or ageing.", "Open a bill to pay or match to PO/GRN."],
  },
  "ap-suppliers": {
    guideSummary:
      "AP Suppliers lists suppliers with payable balances. Open a supplier to see bills and payment history.",
    guideSteps: ["Search or filter to find a supplier.", "Open to view balance and documents."],
  },
  "ap-bills": {
    guideSummary:
      "AP Bills lists supplier bills. Match to PO and GRN, then post and pay via payment run.",
    guideSteps: ["Create or import a bill; link to PO/GRN.", "Post the bill.", "Add to a payment run when paying."],
  },
  "ap-payments": {
    guideSummary:
      "AP Payments lists payments to suppliers. Payments are created from payment runs; view history and status here.",
    guideSteps: ["Filter by supplier or date.", "Open a payment to see details or linked bills."],
  },
  "ap-three-way-match": {
    guideSummary:
      "3-way match reconciles PO, GRN, and supplier invoice. Resolve variances and post the invoice when quantities and prices match.",
    guideSteps: ["Select a bill and view PO/GRN match.", "Resolve quantity or price variances.", "Post when match is accepted."],
  },
  "finance-payments": {
    guideSummary:
      "Payments & Receipts lists all payments and receipts. Use it to see cash movements and link to bank or ledger.",
    guideSteps: ["Filter by type (payment/receipt), account, or date.", "Open a line to see details."],
  },
  "finance-tax": {
    guideSummary:
      "Tax / VAT shows tax configuration and summary. View input vs output VAT and run tax reports.",
    guideSteps: ["Review tax setup and rates.", "Run VAT or WHT reports as needed."],
  },
  "finance-statements": {
    guideSummary:
      "Financial Statements includes P&L, Balance Sheet, and Cash Flow. Run statements for a period and compare to budget if configured.",
    guideSteps: ["Select period and statement type.", "Run and view or export.", "Drill into a line for detail."],
  },
  "finance-statements-pnl": {
    guideSummary:
      "Profit & Loss (P&L) shows revenue, cost, and profit for a period. Run for management reporting and variance analysis.",
    guideSteps: ["Select period and run P&L.", "Drill into a line for transaction detail.", "Compare to budget if configured."],
  },
  "finance-statements-balance-sheet": {
    guideSummary:
      "Balance Sheet shows assets, liabilities, and equity at a point in time. Run for period-end reporting.",
    guideSteps: ["Select period end date and run.", "Drill into account lines for detail.", "Export for auditors or filing."],
  },
  "finance-statements-cash-flow": {
    guideSummary:
      "Cash Flow Statement shows cash movements from operating, investing, and financing activities. Run for liquidity analysis.",
    guideSteps: ["Select period and run cash flow.", "Review operating vs investing vs financing.", "Drill into lines for source transactions."],
  },
  "finance-budgets": {
    guideSummary:
      "Budgets define planned revenue and expenses by account or dimension. Use for variance analysis and forecasting.",
    guideSteps: ["Create a budget and set period and accounts.", "Enter or import budget amounts.", "Compare actual vs budget in reports."],
  },
  "finance-period-close": {
    guideSummary:
      "Period Close locks a period so no more postings can be made. Run close after all entries are posted and reconciled.",
    guideSteps: ["Review open items and reconciliations.", "Run period close for the month.", "Reopen only if you need to correct."],
  },
  "finance-ledger": {
    guideSummary:
      "Ledger shows the full transaction list for the general ledger. Filter by account, period, or document type.",
    guideSteps: ["Set filters and view transactions.", "Drill into a line to see the source document."],
  },
  "finance-audit": {
    guideSummary:
      "Audit Log shows a trail of changes or postings. Use it for compliance and to trace who did what and when.",
    guideSteps: ["Filter by date, user, or entity.", "Export for auditors if needed."],
  },
  // CRM
  "crm-accounts": {
    guideSummary:
      "CRM Accounts are your customer and partner records in one place. Use this page to view and manage relationships, contact details, and link to activities and deals. Accounts here align with Masters > Parties and Finance > AR Customers; add or edit customers from those pages and they appear here.",
    guideSteps: [
      "Add customers or partners from Masters > Parties or Finance > AR Customers (for credit and payment terms).",
      "Use this list to search and open an account to see contact info, activities, and linked deals.",
      "Open an account to add activities (calls, notes) or link deals and opportunities.",
    ],
  },
  "crm-activities": {
    guideSummary:
      "Activities are calls, meetings, emails, and notes logged against accounts or deals. Use this to keep a history of customer interactions and follow-ups.",
    guideSteps: ["Create an activity and link it to an account or deal.", "Filter by type (call, meeting, note) or date.", "Open an account in CRM to see its activity timeline."],
  },
  "crm-deals": {
    guideSummary:
      "Deals (opportunities) track potential sales from lead to close. Set value and stage; move to Won or Lost when the opportunity is resolved.",
    guideSteps: ["Create a deal and set value and stage.", "Update stage as the opportunity progresses.", "Close as Won or Lost to reflect the outcome."],
  },
  "crm-tickets": {
    guideSummary:
      "Support tickets let you track customer issues and requests. Create tickets, assign to users, and update status until resolved.",
    guideSteps: ["Create a ticket and assign to a user or team.", "Update status and add notes as you work on it.", "Close when the issue is resolved."],
  },
  // Reports
  "reports-library": {
    guideSummary:
      "Report Library lists available reports. Run a report for a period or filter and view or export the result.",
    guideSteps: ["Select a report and set parameters.", "Run and view or export (PDF/Excel)."],
  },
  "reports-saved": {
    guideSummary:
      "Saved Views stores your saved report configurations. Open a saved view to run the report with stored filters.",
    guideSteps: ["Save a view from a report after setting filters.", "Open a saved view to run it again."],
  },
  "reports-scheduled": {
    guideSummary:
      "Scheduled Reports run automatically and can be emailed. Set a schedule and recipients for key reports.",
    guideSteps: ["Create a schedule and select report and parameters.", "Set frequency and email recipients.", "Review run history."],
  },
  "reports-exports": {
    guideSummary:
      "Exports lists export jobs or files. Download past exports or create a new export.",
    guideSteps: ["Filter by report or date.", "Download an export file."],
  },
  "reports-vat": {
    guideSummary:
      "VAT Summary shows input and output VAT for a period. Use it for VAT returns and reconciliation.",
    guideSteps: ["Select period and run.", "Review by account or category.", "Export for filing."],
  },
  "reports-wht": {
    guideSummary:
      "WHT Summary shows withholding tax for a period. Use it for WHT returns and reconciliation.",
    guideSteps: ["Select period and run.", "Review by supplier or type.", "Export for filing."],
  },
  // Analytics
  "analytics-hub": {
    guideSummary:
      "Analytics Studio is the main analytics entry. Explore data, view insights, or open product, finance, or other analytics.",
    guideSteps: ["Open Explore or a specific analytics module.", "Apply filters and view charts or tables.", "Ask Copilot to explain a metric."],
  },
  "analytics-explore": {
    guideSummary:
      "Explore lets you query and visualize data. Select dimensions and metrics and build ad-hoc views.",
    guideSteps: ["Select data source and fields.", "Add filters and run.", "Save or export the view."],
  },
  "analytics-insights": {
    guideSummary:
      "Insights shows AI or rule-based insights: anomalies, suggestions, or trends. Use it to spot issues or opportunities.",
    guideSteps: ["Review insight cards and severity.", "Drill into an insight for detail.", "Act on suggestions if relevant."],
  },
  "analytics-anomalies": {
    guideSummary:
      "Anomalies highlights unusual patterns in data (e.g. margin drop, volume spike). Review and investigate or dismiss.",
    guideSteps: ["Review the anomaly list and severity.", "Open one to see detail and cause.", "Dismiss or create a follow-up."],
  },
  "analytics-simulations": {
    guideSummary:
      "Simulations let you model what-if scenarios (e.g. price change, volume). Run a simulation and compare to baseline.",
    guideSteps: ["Set parameters (e.g. new price).", "Run simulation and view impact.", "Apply or discard."],
  },
  "analytics-products": {
    guideSummary:
      "Products analytics shows product performance: margin, volume, growth. Use it for assortment and pricing decisions.",
    guideSteps: ["Select period and metrics.", "Filter by category or channel.", "Export or drill into a product."],
  },
  "analytics-pricing": {
    guideSummary:
      "Pricing analytics shows price and discount impact. Compare list vs actual and margin by segment.",
    guideSteps: ["Select segment and period.", "View price and margin charts.", "Use for pricing decisions."],
  },
  "analytics-inventory": {
    guideSummary:
      "Inventory analytics shows stock levels, turnover, and slow-moving or excess stock. Use it for replenishment and write-offs.",
    guideSteps: ["Select warehouse or category.", "View turnover and ageing.", "Act on recommendations."],
  },
  "analytics-finance": {
    guideSummary:
      "Finance analytics shows revenue, cost, and margin trends. Use it for management reporting and variance analysis.",
    guideSteps: ["Select period and breakdown (e.g. by branch).", "View trends and compare to budget."],
  },
  "analytics-payroll": {
    guideSummary:
      "Payroll analytics shows payroll cost and headcount trends. Use it for labour cost analysis.",
    guideSteps: ["Select period and dimension.", "View cost and headcount charts."],
  },
  "analytics-settings": {
    guideSummary:
      "Analytics settings configures data sources, metrics, or thresholds for insights and anomalies.",
    guideSteps: ["Configure data sources or metrics.", "Set thresholds for alerts or anomalies."],
  },
  // Automation
  "automation-dashboard": {
    guideSummary:
      "Automation Dashboard shows automation status and recent runs. Open rules, workflows, or the work queue from here.",
    guideSteps: ["Review status and open Rules or Workflows.", "Check work queue for pending tasks."],
  },
  "automation-rules": {
    guideSummary:
      "Rules Engine lets you define triggers, conditions, and actions. When a trigger fires and conditions match, the action runs (e.g. create task, send alert).",
    guideSteps: ["Create a rule and set trigger (e.g. document posted).", "Add conditions and action.", "Enable and test."],
  },
  "automation-alerts": {
    guideSummary:
      "Alerts & Notifications lists configured alerts and notification history. Set up alerts for thresholds or events.",
    guideSteps: ["Create an alert and set condition.", "Choose recipients and channel.", "Review history."],
  },
  "automation-schedules": {
    guideSummary:
      "Scheduled Jobs lists jobs that run on a schedule (e.g. nightly report, MRP). View history and enable or disable.",
    guideSteps: ["Create or edit a schedule.", "Set cron or frequency and job.", "Monitor run history."],
  },
  "automation-workflows": {
    guideSummary:
      "Approvals Workflows defines approval chains for documents. Set who approves what and in what order.",
    guideSteps: ["Create a workflow and add steps.", "Assign approvers per step.", "Link to document types."],
  },
  "automation-integrations": {
    guideSummary:
      "Integrations connects the ERP to external systems (e.g. WhatsApp, accounting). Configure and monitor connectors.",
    guideSteps: ["Select an integration and configure credentials.", "Test connection and map fields.", "Monitor sync or events."],
  },
  "automation-ai-insights": {
    guideSummary:
      "AI Insights uses AI to suggest actions or explain data. Review suggestions and apply or dismiss.",
    guideSteps: ["Review insight cards.", "Apply a suggestion or ask for more detail.", "Feedback improves future insights."],
  },
  "work-queue": {
    guideSummary:
      "Work queue lists tasks assigned to you from rules or workflows. Complete or reassign tasks to clear the queue.",
    guideSteps: ["Open a task to see details and linked record.", "Complete or reject and add a note.", "Filter by type or due date."],
  },
  // Settings (main items)
  "settings-org": {
    guideSummary:
      "Organization Profile holds company name, address, and legal details. Update when your company info changes.",
    guideSteps: ["Edit name, address, and registration details.", "Save to update across the system."],
  },
  "settings-platform": {
    guideSummary:
      "Platform Control is for platform operators. Manage tenants, billing, and support. Not visible to normal customers.",
    guideSteps: ["Use only if you are a platform admin.", "Manage customers and view usage."],
  },
  "settings-billing": {
    guideSummary:
      "Billing shows your subscription, usage, and invoices. View plan and upgrade or manage payment method.",
    guideSteps: ["Review usage and current plan.", "Upgrade or change payment method if needed."],
  },
  "settings-entities": {
    guideSummary:
      "Entities defines legal entities or companies in a group. Use for multi-entity and intercompany setup.",
    guideSteps: ["Create entities and set currency and ledger.", "Map intercompany accounts."],
  },
  "settings-branches": {
    guideSummary:
      "Branches defines branches or locations. Each branch can have its own ledger, stock, or reporting.",
    guideSteps: ["Create a branch and set defaults.", "Assign users and data to the branch."],
  },
  "settings-users-roles": {
    guideSummary:
      "Users & Roles lists users and roles. Invite users, assign roles, and enable or disable access. Enable Copilot per user here.",
    guideSteps: ["Invite a user and set role.", "Edit permissions via role or user override.", "Enable Copilot for users who need it."],
  },
  "settings-sequences": {
    guideSummary:
      "Numbering Sequences defines how document numbers are generated (e.g. SO-001, INV-2025-001). Set prefix, length, and next number.",
    guideSteps: ["Create or edit a sequence per document type.", "Set prefix and next number.", "Assign to branch or org if needed."],
  },
  "settings-financial-currencies": {
    guideSummary:
      "Currencies defines your base and foreign currencies. Set exchange rates and use for multi-currency transactions.",
    guideSteps: ["Add currencies and set as base or foreign.", "Enter exchange rates for foreign currencies."],
  },
  "settings-financial-rates": {
    guideSummary:
      "Exchange rates stores historical and current rates for foreign currencies. Update rates for accurate FX valuation.",
    guideSteps: ["Create rate entries per currency and date.", "Use for revaluation and reporting."],
  },
  "settings-financial-coa": {
    guideSummary:
      "Chart of Accounts (under Financial) defines the account structure. Create or edit accounts for posting and reporting.",
    guideSteps: ["Create accounts with type and parent.", "Set posting rules and tax mapping."],
  },
  "settings-financial-taxes": {
    guideSummary:
      "Taxes (under Financial) configures tax rates and accounts. Set VAT, WHT, or other taxes and map to GL accounts.",
    guideSteps: ["Add or edit tax codes and rates.", "Map to GL accounts for posting."],
  },
  "settings-financial-fiscal": {
    guideSummary:
      "Fiscal years defines your accounting periods. Open and close periods; set year-end dates.",
    guideSteps: ["Create a fiscal year and periods.", "Open periods for posting; close when done."],
  },
  "settings-inventory-costing": {
    guideSummary:
      "Costing (under Inventory) sets the inventory costing method (e.g. average, FIFO) and parameters.",
    guideSteps: ["Select costing method.", "Set parameters and run costing if applicable."],
  },
  "settings-uom": {
    guideSummary:
      "UOM catalog defines units of measure and conversions. Use for products and transactions.",
    guideSteps: ["Create UOMs and base unit.", "Add conversions (e.g. 1 box = 12 ea)."],
  },
  "settings-products-pricing-rules": {
    guideSummary:
      "Pricing rules (under Products) configures product-level pricing rules, discount logic, and tiered pricing.",
    guideSteps: ["Create or edit pricing rules.", "Set conditions and price effects.", "Assign to products or channels."],
  },
  "settings-tax-kenya": {
    guideSummary:
      "Kenya tax profile configures Kenya-specific tax settings: KRA PIN, VAT, WHT, and filing preferences.",
    guideSteps: ["Enter KRA PIN and tax registration.", "Configure VAT and WHT rates.", "Set filing preferences."],
  },
  "settings-tax-vat": {
    guideSummary:
      "VAT settings configures VAT rates, accounts, and exemptions for Kenya or other jurisdictions.",
    guideSteps: ["Add VAT codes and rates.", "Map to GL accounts.", "Set exempt products or categories."],
  },
  "settings-tax-withholding": {
    guideSummary:
      "Withholding tax configures WHT rates and accounts for supplier payments and compliance.",
    guideSteps: ["Add WHT codes and rates.", "Map to GL accounts.", "Set applicability by supplier type."],
  },
  "settings-tax-mappings": {
    guideSummary:
      "Tax mappings links tax codes to GL accounts and document types for correct posting.",
    guideSteps: ["Map tax codes to input/output accounts.", "Set defaults per document type."],
  },
  "settings-preferences": {
    guideSummary:
      "Preferences stores user and org-level preferences: date format, currency display, notifications, and defaults.",
    guideSteps: ["Set date format and timezone.", "Configure notification preferences.", "Save to apply."],
  },
  "settings-compliance": {
    guideSummary:
      "Compliance configures regulatory and audit settings. Set retention, audit trails, and compliance flags.",
    guideSteps: ["Review compliance requirements.", "Enable audit trails or retention.", "Configure as needed."],
  },
  "settings-notifications": {
    guideSummary:
      "Notifications configures how and when users receive alerts: email, in-app, or external channels.",
    guideSteps: ["Set notification channels.", "Configure templates and triggers.", "Test delivery."],
  },
  "settings-migrations": {
    guideSummary:
      "Migration Console helps import data from legacy systems. Stage, validate, and load master and transaction data.",
    guideSteps: ["Upload or connect to source.", "Map fields and validate.", "Run migration and reconcile."],
  },
  "settings-payroll": {
    guideSummary:
      "Payroll settings configures pay periods, statutory rates (NSSF, NHIF, PAYE), and payroll defaults.",
    guideSteps: ["Set pay period and cut-off.", "Configure statutory rates.", "Map payroll accounts."],
  },
  "settings-audit-log": {
    guideSummary:
      "Audit Log (Settings) shows system-wide audit trail. Filter by user, entity, or action for compliance.",
    guideSteps: ["Filter by date, user, or action.", "Export for auditors.", "Review retention settings."],
  },
  "settings-customizer-modules": {
    guideSummary:
      "Customizer Modules enables or configures optional modules. Turn on features like manufacturing or franchise.",
    guideSteps: ["Enable or disable modules.", "Configure module-specific settings.", "Apply to org."],
  },
  "settings-customizer-fields": {
    guideSummary:
      "Custom Fields adds user-defined fields to products, parties, or documents. Extend the data model without code.",
    guideSteps: ["Create a custom field and set type.", "Assign to entity (product, party, etc.).", "Use in forms and reports."],
  },
  "settings-customizer-workflows": {
    guideSummary:
      "Customizer Workflows defines custom approval or business process flows. Extend standard workflows.",
    guideSteps: ["Create a workflow and add steps.", "Define conditions and actions.", "Link to document types."],
  },
  "settings-customizer-dashboards": {
    guideSummary:
      "Customizer Dashboards lets you build custom dashboards with widgets and KPIs. Personalize the control tower.",
    guideSteps: ["Add widgets and arrange layout.", "Set data source and filters.", "Save and share."],
  },
  // Help
  tutorial: {
    guideSummary:
      "The Tutorial helps you learn the ERP by module. Open a chapter to see all screens in that section, with links to each page and the option to ask Copilot about any topic.",
    guideSteps: [
      "Browse chapters and click Go to page to open a screen.",
      "Click Ask Copilot on a topic for an explanation.",
      "Use the Tutorial and Ask Copilot buttons on any page for in-context help.",
    ],
  },
};
