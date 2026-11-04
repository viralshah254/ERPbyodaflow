import { afterEach, describe, expect, it } from "vitest";
import { buildScreenSteps } from "./build-screen-steps";
import { resolveScreenGuide } from "./screen-guides";
function root(html: string) { document.body.innerHTML = `<main>${html}</main>`; return document.querySelector("main")!; }
afterEach(() => { document.body.innerHTML = ""; });
describe("page-specific interactive steps", () => {
  it("uses visible controls and authored page semantics without exposing hidden actions", () => {
    const el = root(`<h1>Customer accounts</h1><input type="search" aria-label="Find a customer"/><div data-guide-filters><button role="combobox">All channels</button></div><div hidden><input placeholder="Secret field"/><button role="tab">Hidden tab</button></div><table><thead><tr><th>Credit limit</th><th>Outstanding</th></tr></thead></table>`);
    const steps = buildScreenSteps(resolveScreenGuide("/sales/customers")!, el);
    expect(steps.find(s=>s.id==="search")?.action).toBe("input");
    expect(steps.find(s=>s.id==="filters")?.action).toBe("select");
    expect(steps.find(s=>s.id==="records")?.description).toMatch(/Credit limit/);
    expect(steps.some(s=>s.title.includes("Hidden"))).toBe(false);
  });
  it("does not ask users to change record selectors that might save immediately", () => {
    const el = root(`<h1>Work order</h1><button role="combobox">Production warehouse</button><button role="tab" id="materials">Materials</button>`);
    const steps = buildScreenSteps(resolveScreenGuide("/manufacturing/work-orders/wo-1")!, el);
    expect(steps.some(s=>s.id==="filters")).toBe(false);
    expect(steps.find(s=>s.id==="tab:materials")?.action).toBe("tab");
  });
  it("gives an open form dialog its own fields and purpose", () => {
    const el = root(`<h1>Units of measure</h1><div role="dialog"><h2>Add conversion</h2><label for="factor">Factor</label><input id="factor" type="number" required /></div>`);
    const steps = buildScreenSteps(resolveScreenGuide("/settings/uom")!, el);
    expect(steps[0].title).toContain("Add conversion");
    expect(steps.find(s=>s.id==="field:factor")?.action).toBe("inspect");
    expect(steps.find(s=>s.id==="field:factor")?.description).toMatch(/required|conversion|factor/i);
  });
});

describe("asynchronous targets", () => {
  it("rebinds the result table after a filter replaces its DOM", () => {
    const el = root(`<h1>Stock levels</h1><table><thead><tr><th>Product</th><th>Available</th></tr></thead></table>`);
    const steps = buildScreenSteps(resolveScreenGuide("/inventory/stock-levels")!, el);
    const target = steps.find(step=>step.id==="records")!.target as () => Element | null;
    const old = target();
    el.querySelector("table")!.outerHTML = `<table><thead><tr><th>Product</th><th>Available</th></tr></thead><tbody><tr><td>New result</td></tr></tbody></table>`;
    expect(target()).toBe(el.querySelector("table"));
    expect(target()).not.toBe(old);
  });
});
