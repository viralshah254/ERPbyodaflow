# AI-Native ERP Frontend — Five Intelligence Layers

This document defines the frontend + AI interaction patterns for a modern manufacturing ERP. Every screen, dashboard, and workflow is built around **five AI-driven layers**. The frontend should **feel like a control tower**, not accounting software.

---

## Global frontend principles

All five layers follow:

- **AI-first UX**: insights before tables
- **Actionable recommendations** with confidence scores
- **Simulation before execution**
- **Approval gates** + policy limits
- **Explainability panels** ("Why did AI suggest this?")
- **Audit logs**
- **Human override** at every step
- **Real-time updates**
- **Mobile-ready** plant floor views
- **Offline fallback** where needed

---

## 1. Forecasting & Planning Intelligence

**Purpose:** Predict demand, supply risks, and production needs — surfaced visually and conversationally.

| Requirement | Route / component | Status |
|-------------|-------------------|--------|
| Forecast charts by SKU/region | `/analytics/explore`, `/manufacturing/mrp` | Partial (explore + MRP) |
| Uncertainty bands, seasonality | Analytics Explore, simulations | Stub / mock |
| Scenario simulator | `/analytics/simulations` | Mock sliders |
| Supply risk, raw material trends | Analytics intelligence modules | Stub |
| Recommendation cards + confidence | `RecommendationCard`, Copilot cards | ✅ |
| "Apply Plan" CTA | Simulations, MRP | Toast stub |
| Audit trail panel | Settings audit-log, doc timeline | Partial |

**AI output format:** Suggested action, expected upside, risk score, confidence %, driver factors, alternative scenarios.

**Entry:** Control Tower → Planning, `/analytics/explore`, `/analytics/simulations`, `/manufacturing/mrp`.

---

## 2. Production Optimization

**Purpose:** Continuously optimize factory schedules, batches, and energy use.

| Requirement | Route / component | Status |
|-------------|-------------------|--------|
| Gantt / schedule views | `/manufacturing/work-orders`, routing | List views; Gantt stub |
| Line utilization, changeover | Manufacturing overview | Stub |
| Yield, scrap, energy | Manufacturing / analytics | Stub |
| AI reorder suggestions | MRP, work queue | Partial |
| Root-cause explorer | Analytics anomalies, insights | Partial |
| Simulation toggles | Analytics simulations | Mock |
| Supervisor approval queue | `/approvals/inbox`, My approvals widget | ✅ |

**Entry:** Control Tower → Production, `/manufacturing/work-orders`, `/manufacturing/mrp`, `/manufacturing/routing`, `/approvals/inbox`.

---

## 3. Autonomous Procurement

**Purpose:** AI agents propose orders; humans set guardrails and approve.

| Requirement | Route / component | Status |
|-------------|-------------------|--------|
| Supplier scorecards | `/ap/suppliers`, analytics | Partial |
| Lead-time trends, risk badges | AP / purchasing | Stub |
| Auto-PO preview, reorder calculators | `/purchasing/requests`, MRP | Partial |
| Contract compliance, anomaly feed | Work queue, automation | Stub |
| Agent execution queue | Approvals inbox, work queue | Partial |
| Policy limit settings | Settings, automation | Stub |

**Entry:** Control Tower → Procurement, `/purchasing/orders`, `/purchasing/requests`, `/approvals/inbox`, `/work/queue`.

---

## 4. Finance Intelligence

**Purpose:** Margin leaks, cash forecast, fraud prevention.

| Requirement | Route / component | Status |
|-------------|-------------------|--------|
| Cash runway forecast | `/analytics/finance`, `/treasury/cashflow` | Mock |
| Margin waterfall | `/analytics/products`, products intelligence | ✅ |
| Cost spike detectors | Analytics anomalies, finance | Partial |
| Invoice reconciliation | `/ap/three-way-match`, bank recon | Partial |
| Fraud risk, tax alerts | Work queue, reports | Stub |
| Drill-down modals | Doc view, ApprovalDetailSheet | ✅ |
| Approval workflows | Approvals inbox, doc actions | ✅ |

**Entry:** Control Tower → Finance, `/analytics/finance`, `/finance/bank-recon`, `/ap/three-way-match`, `/approvals/inbox`.

---

## 5. Natural-Language ERP Interface

**Purpose:** Replace menu-heavy navigation with conversational commands.

| Requirement | Route / component | Status |
|-------------|-------------------|--------|
| Floating command bar | Command palette (⌘K) | ✅ |
| Natural language → intent | Command palette "Ask AI" / intent preview | ✅ (stub) |
| Intent preview modal | Command palette | Stub |
| Generated dashboard canvas | Copilot, analytics explore | Partial |
| Action confirmation, approval | Doc/approval flows | ✅ |
| History, role-based permissions | Audit log, users/roles | Partial |

**Entry:** Control Tower → Ask AI, **⌘K** command palette, `/automation/ai-insights`, Copilot drawer.

---

## Cross-layer requirements

- **Unified data model**: Shared types in `@/lib`, mocks in `@/lib/mock`
- **Simulation sandbox**: `/analytics/simulations`, MRP apply stub
- **Approval routing**: Approvals inbox, My approvals widget, doc actions
- **Explainability**: RecommendationCard drivers, anomaly "Investigate", Copilot review
- **Versioned recommendations / audit**: Audit log, doc timeline (stub)

---

## Implementation phasing (frontend)

### Phase 1 (current)
- [x] Command bar (palette) + intent preview stub
- [x] Forecast/planning surfaces: Analytics Explore, Simulations, MRP
- [x] Production: Work orders, MRP, routing
- [x] Procurement proposals: Purchasing, approvals, work queue
- [x] Finance alerts: Analytics finance, margin waterfall, bank recon, approvals
- [x] Control Tower entry point
- [x] Reusable AI recommendation card (confidence, drivers, risk, Simulate/Approve/Override)

### Phase 2
- Autonomous agents UI (proposal queue, policy dashboard)
- Closed-loop execution (approve → execute)
- Simulation engine (what-if persistence)
- Policy automation (rules, limits)

### Phase 3
- Self-optimizing supply chain views
- RL schedules, negotiation bots
- Predictive maintenance

---

## North star UX

The ERP should feel like: **a supply chain autopilot with human supervision** — not forms software, static dashboards, or accounting-first systems.

---

*Reference: Control Tower `/control-tower`, Command palette (⌘K), `src/components/ai/RecommendationCard.tsx`, `docs/FRONTEND_COMPLETION_6_SESSIONS.md`.*
