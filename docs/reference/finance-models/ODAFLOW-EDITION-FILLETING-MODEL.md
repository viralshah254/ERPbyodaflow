# ODAFLOW EDITION — Filleting Model: Finance Reference

**Workbook:** `ODAFLOW-EDITION.xlsx` (same folder as this file)
**Sheet of interest:** `Filleting Model`
**Secondary sheet:** `SKUs` (SKU taxonomy and sales channels — read-only reference)

> After any edits to the workbook, verify that row and column positions below still match. Numbers in this document were extracted from the committed copy and are accurate as of the commit that added this file.

---

## Workbook Layout: Three Side-by-Side Blocks

The `Filleting Model` sheet is divided into three **vertical blocks**, each modelling a different species/process combination at a common baseline of **10,000 kg purchased input**. They share the same general column pattern (inputs → outcome distributions → volumes → revenue → costs → margin) but are offset across columns.

| Block | Title cell | Rows | Primary input column range |
| ----- | ---------- | ---- | -------------------------- |
| **1 · Tilapia – Filleting** | A2 | 2–6 | B–AI |
| **2 · Nile Perch – Filleting** | A8 | 8–12 | B–AY |
| **3 · Tilapia – Sun Drying** | A15 | 15–19 | B–Y |

---

## Block 1 — Tilapia Filleting (rows 2–6)

### Inputs (row 2 headers / row 3 values)

| Column | Label | Value |
| ------ | ----- | ----- |
| B3 | Purchased Quantity (kg) | **10,000** |
| C3 | Received Quantity (kg) | **10,000** |
| D3 | Product Price (KES/kg) | **305** |
| E3 | Cost of Finance | 0 |
| F3 | Inbound Logistics (KES) | 32,857 |

### Processing outcome distribution (row 3, cols I–N)

> Fractions of received kg that become each output. These drive all volume calculations.

| Column | SKU | Fraction | Implied kg (of 10,000) |
| ------ | --- | -------- | ---------------------- |
| I3 | Fillet | 32.1% | 3,210 → packed to **3,531 kg** (glazing adds weight) |
| J3 | Frame (Mgongo Wazi) | 58.0% | 5,800 kg |
| K3 | Skin | 5.0% | 500 kg |
| L3 | Chips | 3.0% | 300 kg |
| M3 | Fins | 2.0% | 200 kg |
| N3 | Water Loss | 0% | — |

### Selling prices (row 3, cols Q–V — "Selling Price per KG" header in P3)

| SKU | Price (KES/kg) |
| --- | -------------- |
| Fillet | 950 |
| Frame | 90 |
| Skin | 20 |
| Chips | 280 |
| Fins | 100 |

### Outputs / Results (row 5 headers / row 6 values)

| Column | Item | Value |
| ------ | ---- | ----- |
| B6 | Count of boxes (6 kg each) | **588.5** |
| C6 | Count of sacks | **193.3** |
| F6–J6 | Volumes (kg): Fillet / Frame / Skin / Chips / Fins | 3,531 / 5,800 / 500 / 300 / 200 |
| N6–S6 | Revenue (KES): Fillet / Frame / Skin / Chips / Fins | 3,354,450 / 522,000 / 10,000 / 84,000 / 20,000 |
| T6 | **Total Revenue (KES)** | **3,990,450** |
| AF6 | **Total Costs (KES)** | **3,377,939** |
| AH6 | **Gross Margin (KES)** | **612,511** |
| AI6 | **Gross Margin %** | **15.3%** |

### Cost breakdown (row 5 headers / row 6 values, cols V–AF)

| Item | KES |
| ---- | --- |
| Product cost (10,000 kg × 305) | 3,050,000 |
| Inbound logistics | 32,857 |
| Boxes capacity / glazing | 34,133 |
| Processing fee (labor + electricity) | 190,000 |
| Polythene per box | 2,943 |
| Straps per box | 2,354 |
| Sacks | 9,667 |
| Outbound logistics | 55,986 |
| **Total** | **3,377,939** |

---

## Block 2 — Nile Perch Filleting (rows 8–12)

### Inputs (row 8 headers / row 9 values)

| Column | Label | Value |
| ------ | ----- | ----- |
| B9 | Purchased Quantity (kg) | **10,000** |
| C9 | Received Quantity (kg) | **10,000** |
| D9 | Product Price (KES/kg) | **546** |
| E9 | Cost of Finance | 0 |
| F9 | Inbound Logistics (KES) | 32,857 |

### Processing outcome distribution (row 9, cols I–V)

Nile Perch has a much richer byproduct mix than Tilapia. The high-value **maw (swim bladder)** bands are separated by weight grade with dramatically higher unit prices.

| Column | SKU | Fraction | Implied kg |
| ------ | --- | -------- | ---------- |
| I9 | Fillet | 43.0% | 4,300 → packed **4,859 kg** |
| J9 | Maw (0–50 g) | 2.0% | 200 kg |
| K9 | Maw (51–100 g) | ~0% | — |
| L9 | Maw (101–200 g) | ~0% | — |
| M9 | Frame (Mgongo Wazi) | 30.0% | 3,000 kg |
| N9 | Chest | 5.61% | 561 kg |
| O9 | Chips | 4.14% | 414 kg |
| P9 | Fat | 2.70% | 270 kg |
| Q9 | Fin | 2.75% | 275 kg |
| R9 | Eggs | 0.25% | 25 kg |
| S9 | Skin | 7.60% | 760 kg |
| T9 | Reject | 1.84% | 184 kg |
| U9 | Whole fish (unsorted) | — | — |
| V9 | Water Loss | — | — |

### Selling prices (row 9, cols Y–AJ — "Selling Price per KG" header in X9)

| SKU | Price (KES/kg) | Note |
| --- | -------------- | ---- |
| Fillet | 950 | Same as Tilapia fillet |
| Maw (0–50 g) | 7,900 | Premium byproduct |
| Maw (51–100 g) | 10,000 | |
| Maw (101–200 g) | 13,000 | Highest unit value in model |
| Frame | 55 | Lower than Tilapia frame (90) |
| Chest | 120 | |
| Chips | 250 | |
| Fat | 90 | |
| Fin | 100 | |
| Eggs | 100 | |
| Skin | 20 | |
| Reject | 23 | |

### Outputs / Results (row 11 headers / row 12 values)

| Column | Item | Value |
| ------ | ---- | ----- |
| B12 | Count of boxes (6 kg each) | **809.8** |
| C12 | Count of sacks | **100** |
| F12–R12 | Volumes (kg): Fillet / Maw0-50 / Frame / Chest / Chips / Fat / Fin / Eggs / Skin / Reject | 4,859 / 200 / 3,000 / 561 / 414 / 270 / 275 / 25 / 760 / 184 |
| V12–AH12 | Revenue (KES) by SKU | see below |
| AJ12 | **Total Revenue (KES)** | **6,605,475** |
| AV12 | **Total Costs (KES)** | **5,805,397** |
| AX12 | **Gross Margin (KES)** | **800,079** |
| AY12 | **Gross Margin %** | **12.1%** |

Revenue by SKU:

| SKU | Revenue (KES) |
| --- | ------------- |
| Fillet | 4,616,050 |
| Maw (0–50 g) | 1,580,000 |
| Frame | 165,000 |
| Chest | 67,293 |
| Chips | 103,481 |
| Fat | 24,308 |
| Fin | 27,451 |
| Eggs | 2,465 |
| Skin | 15,195 |
| Reject | 4,234 |
| **Total** | **6,605,475** |

### Cost breakdown (row 11 headers / row 12 values, cols AL–AV)

| Item | KES |
| ---- | --- |
| Product cost (10,000 kg × 546) | 5,460,000 |
| Inbound logistics | 32,857 |
| Boxes capacity / glazing | 46,970 |
| Processing fee (labor + electricity) | 190,000 |
| Polythene per box | 4,049 |
| Straps per box | 3,239 |
| Sacks | 5,000 |
| Outbound logistics | 63,281 |
| **Total** | **5,805,397** |

---

## Block 3 — Tilapia Sun Drying (rows 15–19)

### Inputs (row 15 headers / row 16 values)

| Column | Label | Value |
| ------ | ----- | ----- |
| B16 | Purchased Quantity (kg) | **10,000** |
| C16 | Received Quantity (kg) | **10,000** |
| D16 | Product Price (KES/kg) | **305** |
| E16 | Inbound Logistics (KES) | **52,000** |

Note: inbound logistics are higher than the filleting blocks (52,000 vs 32,857), reflecting a different transport/drying facility assumption.

### Processing outcome distribution (row 15/16, cols G–H)

| Column | SKU | Fraction | Implied kg |
| ------ | --- | -------- | ---------- |
| H16 | Dried Fish | 55.0% | **5,500 kg** |

### Selling prices (row 15/16, cols J–K)

| SKU | Price (KES/kg) |
| --- | -------------- |
| Dried Fish | 775 |

### Outputs / Results (rows 18–19)

| Column | Item | Value |
| ------ | ---- | ----- |
| B19 | Volume: Dried Fish (kg) | **5,500** |
| E19–F19 | Revenue (KES) | **4,262,500** |
| M19 | **Total Costs (KES)** | **3,507,000** |
| O19 | **Gross Margin (KES)** | **755,500** |
| P19 | **Gross Margin %** | **17.7%** |

### Cost breakdown (row 18 headers / row 19 values, cols H–M)

| Item | KES |
| ---- | --- |
| Product cost (10,000 kg × 305) | 3,050,000 |
| Inbound logistics | 52,000 |
| Processing fee (labor + service charge) | 350,000 |
| Outbound logistics | 55,000 |
| **Total** | **3,507,000** |

---

## Side-by-Side Comparison (per 10,000 kg input)

| | Tilapia Filleting | Nile Perch Filleting | Tilapia Sun Drying |
| --------------------------------------- | ----------------: | -------------------: | -----------------: |
| **Purchase price (KES/kg)** | 305 | 546 | 305 |
| **Primary output yield** | Fillet 32.1% | Fillet 43.0% | Dried fish 55.0% |
| **Primary output volume (kg)** | 3,531 | 4,859 | 5,500 |
| **Total Revenue (KES)** | 3,990,450 | 6,605,475 | 4,262,500 |
| **Total Costs (KES)** | 3,377,939 | 5,805,397 | 3,507,000 |
| **Gross Margin (KES)** | 612,511 | 800,079 | 755,500 |
| **Gross Margin %** | 15.3% | 12.1% | 17.7% |

**Key observations:**

- **Nile Perch generates the highest absolute margin** (KES 800k vs KES 755k vs KES 612k) but at a lower margin % because raw fish cost is 79% higher (546 vs 305/kg).
- **Tilapia Sun Drying yields the best margin %** (17.7%) despite having no fillet premium, due to low processing cost and 55% yield on dried weight.
- **Nile Perch maw is a disproportionate revenue driver**: at only 2% of input weight but KES 7,900–13,000/kg, the maw bands contribute ~KES 1.58M+ of the total KES 6.6M revenue. A drop in maw yield or price has an outsized effect on NP profitability.
- **Tilapia frame volume dominates Tilapia output** (58% = 5,800 kg) at only KES 90/kg — a bulk but low-value byproduct.
- The model uses a **fixed 10,000 kg input for all three blocks** — to compare a different purchase quantity, change B3/C3 (Tilapia filleting), B9/C9 (Nile Perch), or B16/C16 (Sun Drying) independently and re-read the results rows (row 6, 12, 19).

---

## How to Update the Model

1. **Change input quantity:** Edit the `Purchased Quantity (Kgs)` and `Received Quantity (Kgs)` cells in row 3, 9, or 16 for the relevant block.
2. **Change purchase price:** Edit the `Product Price` cell (D3, D9, D16).
3. **Change yield fractions:** Edit the `Distribution` row (I3–N3 for Tilapia filleting; I9–V9 for NP filleting; H16 for sun drying). Ensure fractions sum correctly — the model does not auto-validate this.
4. **Change selling prices:** Edit the `Selling Price per KG` row (P3/Q3–V3 for Tilapia; X9/Y9–AJ9 for NP; J15/K16 for sun drying).
5. After edits, commit the updated xlsx to the same path (`docs/reference/finance-models/ODAFLOW-EDITION.xlsx`) and update the "accurate as of" note at the top of this file.

---

## Known Issues in the Workbook

| Issue | Location | Impact |
| ----- | -------- | ------ |
| Typo "Whiole" | Nile Perch Whole Fish label (rows 8–12) | Cosmetic; does not affect calculation |
| Typo "DRIE FISH" | Sun Drying distribution label (H15) | Cosmetic; `DRIED FISH` and `DIRED FISH` labels appear in adjacent columns |
| Maw bands 51–100 and 101–200 show 0 kg | Rows 9, 12 | The current distribution assigns all maw to the 0–50 band; update K9/L9 to model higher-grade maw |

---

## SKUs Sheet (Sheet 2)

This sheet maps processing outcomes to named sales SKUs and channels. It is a reference taxonomy — no formulas link it back to the Filleting Model calculations.

| Section (rows) | Species | Outcome |
| -------------- | ------- | ------- |
| Sourcing/Purchase (row 2) | Nile Perch (Mixed, S/M/L) + Tilapia (Mixed, S1–S7+) | Raw round fish grades |
| Processing Outcome 1 — Filleting (row 4) | Nile Perch & Tilapia | 6 kg fillet boxes (small <200 g / large >200 g grams) |
| Sales SKU — Filleting (row 6) | Nile Perch & Tilapia | Fillet boxes + Fish Frames/Mgongo Wazi → Institutional Buyers / Franchises / Bulk Buyers |
| Processing Outcome 2 — Gutting (row 9) | Nile Perch (S/M/L) + Tilapia (Grades 1–9+) | Gutted whole fish by grade |
| Sales — Gutting (row 11) | Nile Perch & Tilapia | Graded gutted fish → Franchises / Bulk Buyers |
| Processing Outcome 3 — Sun Drying (row 14) | Nile Perch (Mixed) + Tilapia (Mixed) | Dried fish |
| Sales — Sun Dried (row 16) | Nile Perch & Tilapia | Mixed dried fish → Bulk Buyers / Export |
