import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveGuide } from "./InteractiveGuide";
import { useAuthStore } from "@/stores/auth-store";
import type { InteractiveGuideStep } from "@/lib/tutorial/interactive-types";
const key = "erp-page-guide:v2:local:local:/test";
function fixture(steps: InteractiveGuideStep[], html = <input id="field" />) { return <>{html}<InteractiveGuide guideId="/test" title="Test screen" steps={steps} /></>; }
const launch = () => fireEvent.click(screen.getByRole("button", { name: "Help with this page" }));
const next = () => screen.getByRole("button", { name: /^(Next|Finish walkthrough)$/ });
beforeEach(()=>{ localStorage.clear(); useAuthStore.setState({ user:null, org:null }); });
afterEach(cleanup);
describe("shared interactive guide contract",()=>{
  it("gates search on real valid input and does not collect field contents in progress",()=>{
    render(fixture([{id:"find",target:"#field",title:"Find customer",description:"Search customer accounts.",action:"input"}]));
    launch(); expect(next()).toBeDisabled();
    fireEvent.input(document.getElementById("field")!,{target:{value:"private customer name"}});
    expect(next()).toBeEnabled();fireEvent.click(next());
    expect(JSON.parse(localStorage.getItem(key)!).status).toBe("completed");
    expect(localStorage.getItem(key)).not.toContain("private customer name");
  });
  it("recognises pointerdown before a Radix select hides the page",()=>{
    render(fixture([{id:"filter",target:"#filter",title:"Filter",description:"Review scope.",action:"select"}],<button id="filter" role="combobox">Status</button>));
    launch();expect(next()).toBeDisabled();
    fireEvent.pointerDown(document.getElementById("filter")!);expect(next()).toBeEnabled();
  });
  it("recognises a tab only after it is selected",async()=>{
    render(fixture([{id:"tab",target:"#tab",title:"Ledger",description:"Inspect account entries.",action:"tab"}],<button id="tab" role="tab" aria-selected="false">Ledger</button>));
    launch();expect(next()).toBeDisabled();
    await act(async()=>{document.getElementById("tab")!.setAttribute("aria-selected","true");});
    expect(next()).toBeEnabled();
  });
  it("records skipped work as reviewed and preserves it on resume",()=>{
    const steps:InteractiveGuideStep[]=[{id:"unavailable",target:"#absent",title:"Restricted task",description:"Requires another role."},{id:"end",target:"#field",title:"Review",description:"Review the screen."}];
    render(fixture(steps));launch();fireEvent.click(screen.getByRole("button",{name:"Skip task"}));
    fireEvent.click(screen.getByRole("button",{name:"Save and exit guide"}));launch();fireEvent.click(next());
    expect(JSON.parse(localStorage.getItem(key)!).status).toBe("reviewed");
    expect(screen.getByRole("heading",{name:"Walkthrough reviewed"})).toBeVisible();
  });
  it("restores progress by stable step identity when a conditional step disappears",()=>{
    localStorage.setItem(key,JSON.stringify({status:"in-progress",index:4,stepId:"saved",skipped:[]}));
    render(fixture([{id:"first",target:"#field",title:"First",description:"First step."},{id:"saved",target:"#field",title:"Saved task",description:"Resume here."}]));launch();
    expect(screen.getByRole("heading",{name:"Saved task"})).toBeVisible();
  });
  it("does not invoke save, approve or delete while inspecting an action area",()=>{
    const write = vi.fn();
    render(fixture([{id:"action",target:"#actions",title:"Review actions",description:"Decide deliberately.",action:"inspect"}],<div id="actions"><button onClick={write}>Post invoice</button></div>));
    launch();
    fireEvent.focusIn(document.getElementById("actions")!);fireEvent.click(next());
    expect(write).not.toHaveBeenCalled();
  });
  it("cleans target markers and tabindex on unmount",()=>{
    const view = render(fixture([{id:"inspect",target:"#area",title:"Inspect",description:"Review details.",action:"inspect"}],<div id="area">Details</div>));
    launch();const area=document.getElementById("area")!;
    expect(area).toHaveAttribute("tabindex","0");expect(area).toHaveAttribute("data-guide-active","true");
    view.unmount();expect(area).not.toHaveAttribute("data-guide-active");expect(area).not.toHaveAttribute("tabindex");
  });
  it("does not treat CSS-hidden targets as available",()=>{
    render(fixture([{id:"hidden",target:"#hidden",title:"Hidden area",description:"Wait for it."}],<div style={{display:"none"}}><div id="hidden">Hidden</div></div>));
    launch();expect(next()).toBeDisabled();
  });
});

it("restores the assistant when the user switches from a walkthrough to Gaia",()=>{
  render(fixture([{id:"intro",target:"#field",title:"Overview",description:"Review the screen."}]));
  launch();expect(document.documentElement).toHaveAttribute("data-erp-guide-open","true");
  act(()=>window.dispatchEvent(new Event("gaia:ask")));
  expect(screen.queryByRole("region",{name:"Interactive page guide"})).not.toBeInTheDocument();
  expect(document.documentElement).not.toHaveAttribute("data-erp-guide-open");
});

it("never submits a surrounding form when guide buttons are used",()=>{
  const submit=vi.fn((event:React.FormEvent)=>event.preventDefault());
  render(<form role="dialog" aria-label="Edit record" onSubmit={submit}><input id="form-field" /><InteractiveGuide guideId="form" title="Form help" steps={[{id:"intro",target:"#form-field",title:"Review form",description:"Inspect without saving."}]} /></form>);
  launch();fireEvent.click(next());fireEvent.click(screen.getByRole("button",{name:"Close guide"}));
  expect(submit).not.toHaveBeenCalled();
});
