import type { ScreenGuide } from "./screen-guides";
import { isGuideTargetVisible, type InteractiveGuideStep } from "./interactive-types";
import { tutorialTerms } from "./knowledge";

const text = (element: Element) => (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim();
const writable = (el: Element) => !el.matches(":disabled, [aria-disabled=true], [readonly]");
const unique = (values: string[]) => [...new Set(values)];
const titleForInput = (input: HTMLInputElement | HTMLTextAreaElement) => input.labels?.[0]?.textContent?.trim() || input.getAttribute("aria-label") || input.parentElement?.querySelector("label")?.textContent?.trim() || input.placeholder || input.name || "Search";
function matchingTask(guide: ScreenGuide, label: string): string | undefined {
  const words = tutorialTerms(label);
  return guide.tasks.map(task => ({ task, score: words.filter(w => task.toLowerCase().includes(w)).length }))
    .filter(row => row.score > 0).sort((a,b) => b.score-a.score)[0]?.task;
}
/** Rebind after filtering/loading replaces a control; never retain a detached DOM snapshot. */
function liveTarget(element: HTMLElement): () => Element | null {
  const scope = element.closest<HTMLElement>("[role=dialog], [data-tutorial-hint=page-main]") ?? element.parentElement;
  const id = element.id;
  const attrs = ["data-tutorial-hint", "data-tour-step", "aria-label", "name", "placeholder"].map(key => [key, element.getAttribute(key)] as const).filter((pair): pair is readonly [string, string] => !!pair[1]);
  const signature = (el: Element) => el.matches("table,[role=table]") ? [...el.querySelectorAll("th,[role=columnheader]")].map(text).join("|") : text(el.querySelector("h2,h3") ?? el).slice(0,160);
  const label = signature(element);
  return () => {
    if (element.isConnected) return element;
    if (!scope?.isConnected) return null;
    const candidates = [...scope.querySelectorAll<HTMLElement>(element.tagName.toLowerCase())].filter(isGuideTargetVisible);
    return candidates.find(el => id && el.id === id) ?? candidates.find(el => attrs.length && attrs.every(([key,value]) => el.getAttribute(key) === value)) ?? candidates.find(el => label && signature(el) === label) ?? null;
  };
}
function inspect(element: HTMLElement, id: string, title: string, description: string): InteractiveGuideStep {
  return { id, target: liveTarget(element), title, description, action: "inspect", instruction: `Click or focus the highlighted ${title.toLowerCase()} area after reviewing it.` };
}

/** Use authored route content and currently visible controls. No action is executed by this builder. */
export function buildScreenSteps(guide: ScreenGuide, root: HTMLElement): InteractiveGuideStep[] {
  const activeDialog = [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter(isGuideTargetVisible).at(-1);
  const area = activeDialog ?? root;
  const heading = area.querySelector<HTMLElement>("h1, [role=heading], h2");
  const title = heading ? text(heading) : guide.title;
  const primary = area.querySelector<HTMLElement>("[data-tutorial-hint=page-title]") ?? heading ?? area;
  const steps: InteractiveGuideStep[] = [{ id: activeDialog ? "dialog-overview" : "overview", target: liveTarget(primary), title: `${title} · ${activeDialog ? "dialog" : guide.kind === "record" ? "record" : guide.kind === "create" ? "create" : guide.kind === "edit" ? "edit" : "overview"}`, description: `${activeDialog ? document.getElementById(activeDialog.getAttribute("aria-describedby") || "")?.textContent?.trim() || guide.summary : guide.summary}${activeDialog ? " Complete only the fields relevant to this open dialog. Closing the guide leaves your form intact." : ""}` }];
  const add = (step: InteractiveGuideStep) => { if (!steps.some(s => s.id === step.id)) steps.push(step); };
  const controls = [...area.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].filter(el => isGuideTargetVisible(el) && writable(el) && !el.closest("[data-tutorial-hint=page-help]") && !["password", "hidden", "file", "checkbox", "radio", "submit"].includes(el.type));
  const search = controls.find(el => el.type === "search" || /search|find|filter/i.test(`${el.placeholder} ${el.getAttribute("aria-label") || ""}`));
  if (search) {
    const label = titleForInput(search);
    add({ id: "search", target: liveTarget(search), title: `Find ${guide.title.toLowerCase()}`, description: matchingTask(guide, "search") ?? `Use ${label.toLowerCase()} to locate the relevant record in ${guide.title}. Clearing the search restores the current filter scope.`, action: "input", instruction: "Enter a search term in the highlighted field. This changes the current view only." });
  }
  const selectors = [...area.querySelectorAll<HTMLElement>("select, [role=combobox]")].filter(el => isGuideTargetVisible(el) && writable(el));
  // Select interactions are allowed only for view filters. Record and setup selectors can save immediately.
  const filters = selectors.filter(el => el.closest("[data-guide-filters]") || (guide.kind === "report" && el.closest("form")));
  if (filters.length) add({ id: "filters", target: liveTarget(filters[0]), title: `Set ${guide.title.toLowerCase()} scope`, description: matchingTask(guide, "filter") ?? guide.tasks[0] ?? guide.summary, action: "select", instruction: "Open the highlighted filter and review its options. Choose a value only when it matches your task." });
  for (const tab of [...area.querySelectorAll<HTMLElement>("[role=tab]")].filter(isGuideTargetVisible).slice(0, 6)) {
    const label = text(tab).replace(/(?:\s*\(\d+\)|\d+)$/, "").trim();
    if (!label) continue;
    add({ id: `tab:${tab.id || label}`, target: liveTarget(tab), title: `Open ${label}`, description: matchingTask(guide, label) ?? `Review ${label} for ${guide.title.toLowerCase()}. The selected record and your permissions determine the content available in this section.`, action: "tab", instruction: `Select the ${label} tab, then continue. Read the new section before performing a business action.` });
  }
  for (const hint of guide.hints) {
    let el: HTMLElement | null = null;
    try { el = area.querySelector<HTMLElement>(hint.selector); } catch { continue; }
    if (!isGuideTargetVisible(el) || el.closest("[data-tutorial-hint=page-help]")) continue;
    const label = text(el.querySelector("h2, h3, label") ?? el).slice(0, 65) || guide.title;
    add(inspect(el, `hint:${hint.selector}`, label, hint.hint));
  }
  // Editable fields are inspected without forcing a real form to be filled or submitted.
  if ((guide.kind === "create" || guide.kind === "edit" || guide.kind === "report" || guide.route.startsWith("/settings/") || activeDialog) && controls.filter(el => el !== search).length) {
    for (const input of controls.filter(el => el !== search).slice(0, 4)) {
      const label = titleForInput(input);
      add(inspect(input, `field:${input.id || input.name || label}`, label, matchingTask(guide, label) ?? `Review ${label} in this ${guide.title.toLowerCase()} form. ${input.required ? "This field is required before saving. " : ""}Check the value and validation before your own save action.`));
    }
  }
  const sections = [...area.querySelectorAll<HTMLElement>("[data-guide-card], [data-tutorial-hint], [data-tour-step]")].filter(el => isGuideTargetVisible(el) && !el.matches("[data-tutorial-hint=page-title], [data-tutorial-hint=page-actions], [data-tutorial-hint=page-help], [data-tutorial-hint=page-main]") && !el.closest("[data-tutorial-hint=page-help]"));
  for (const el of sections.slice(0, 8)) {
    const head = el.querySelector<HTMLElement>("h2,h3,[data-guide-heading]");
    const label = head ? text(head) : "";
    if (!label) continue;
    const source = guide.sections.find(section => section.title === label);
    const description = el.querySelector<HTMLElement>("[data-guide-description]")?.textContent?.trim() || source?.description || matchingTask(guide, label);
    if (description) add(inspect(el, `section:${label}`, label, description));
  }
  const table = [...area.querySelectorAll<HTMLElement>("table, [role=table], [role=grid]")].find(isGuideTargetVisible);
  if (table) {
    const headers = unique([...table.querySelectorAll("th, [role=columnheader]")].map(text)).slice(0, 8);
    add(inspect(table, "records", guide.kind === "report" ? "Read the report result" : guide.kind === "record" ? "Review record lines" : `Review ${guide.title.toLowerCase()}`, `${matchingTask(guide, headers.join(" ")) ?? guide.tasks.find(task => /review|compare|inspect/i.test(task)) ?? guide.summary}${headers.length ? ` The visible columns are ${headers.join(", ")}.` : ""} Check empty-state or validation messages before relying on the result.`));
  }
  const actions = area.querySelector<HTMLElement>("[data-tutorial-hint=page-actions], [data-tutorial-hint=record-actions]");
  const labels = actions ? [...actions.querySelectorAll("button,a")].filter(el => isGuideTargetVisible(el) && !el.closest("[data-tutorial-hint=page-help]")).map(text).filter(label => label && !/^(⌘|ctrl|Help|Tutorial)/i.test(label)) : [];
  if (actions && labels.length) add(inspect(actions, "next-action", "Choose the next action", `${guide.tasks.at(-1) ?? guide.summary} Your visible actions include ${labels.join(", ")}. The walkthrough does not press these controls. Review their effect and confirm business changes yourself.`));
  if (steps.length === 1) add(inspect(primary, "review", `Review ${guide.title.toLowerCase()}`, guide.tasks.join(" ") || guide.summary));
  const status = area.querySelector<HTMLElement>("[data-guide-status], [role=alert]");
  if (isGuideTargetVisible(status) && text(status)) add(inspect(status, "status", "Check status and messages", `${text(status)} Review this message before proceeding. The guide does not clear a business validation or permission requirement.`));
  const priority = (id: string) => id === "overview" || id === "dialog-overview" ? 0 : id === "search" ? 1 : id === "filters" ? 2 : id.startsWith("field:") || id.startsWith("hint:") || id.startsWith("section:") ? 3 : id === "records" ? 4 : id.startsWith("tab:") ? 5 : 6;
  return steps.sort((a,b) => priority(a.id) - priority(b.id));
}
