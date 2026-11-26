/**
 * Up and Down move between the same editable field on the previous or next
 * row. The page scrollbar still scrolls the list; these keys do not.
 */

const TEXT_TYPES = new Set([
  "",
  "text",
  "number",
  "search",
  "tel",
  "email",
  "url",
  "password",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
]);

export function isArrowNavInput(target: EventTarget | null): target is HTMLInputElement {
  if (!(target instanceof HTMLInputElement)) return false;
  if (target.disabled || target.readOnly) return false;
  return TEXT_TYPES.has(target.type);
}

export function arrowNavBlocked(target: HTMLElement): boolean {
  if (target.getAttribute("role") === "combobox") return true;
  if (target.getAttribute("aria-expanded") === "true") return true;
  if (target.closest("[data-arrow-nav='off'], [role='listbox'], [data-radix-select-content], [data-radix-popper-content-wrapper], [data-async-searchable-panel], [cmdk-root]")) {
    return true;
  }
  return false;
}

function usable(el: HTMLInputElement): boolean {
  if (!isArrowNavInput(el) || arrowNavBlocked(el)) return false;
  if (el.closest("[hidden], [aria-hidden='true']")) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function markedPeers(current: HTMLInputElement): HTMLInputElement[] | null {
  const arrow = current.getAttribute("data-arrow-field");
  const line = current.getAttribute("data-line-field");
  const transfer = current.hasAttribute("data-transfer-qty");
  if (!arrow && !line && !transfer) return null;
  const scope = current.closest("[data-arrow-nav], table") ?? document;
  const selector = arrow
    ? `input[data-arrow-field="${CSS.escape(arrow)}"]`
    : line
      ? `input[data-line-field="${CSS.escape(line)}"]`
      : "input[data-transfer-qty]";
  return [...scope.querySelectorAll<HTMLInputElement>(selector)].filter(usable);
}

function tableColumnPeers(current: HTMLInputElement): HTMLInputElement[] {
  const cell = current.closest("td, th");
  const row = cell?.parentElement;
  const table = current.closest("table");
  if (!cell || !row || !table) return [];
  const cellIndex = [...row.children].indexOf(cell);
  const inCell = [...cell.querySelectorAll<HTMLInputElement>("input")].filter(usable);
  const inputIndex = inCell.indexOf(current);
  if (cellIndex < 0 || inputIndex < 0) return [];
  const peers: HTMLInputElement[] = [];
  for (const bodyRow of table.querySelectorAll("tbody tr")) {
    const peerCell = bodyRow.children[cellIndex];
    if (!peerCell) continue;
    const peer = [...peerCell.querySelectorAll<HTMLInputElement>("input")].filter(usable)[inputIndex];
    if (peer) peers.push(peer);
  }
  return peers;
}

function regionPeers(current: HTMLInputElement): HTMLInputElement[] {
  const region = current.closest("[data-arrow-nav]");
  if (!region || region.getAttribute("data-arrow-nav") === "off") return [];
  if (current.closest("table")) return [];
  return [...region.querySelectorAll<HTMLInputElement>("input")].filter((el) => usable(el) && !el.closest("table"));
}

export function arrowFieldPeers(current: HTMLInputElement): HTMLInputElement[] {
  const marked = markedPeers(current);
  if (marked) return marked;
  const column = tableColumnPeers(current);
  if (column.length > 1) return column;
  return regionPeers(current);
}

export function nextArrowField(current: HTMLInputElement, direction: 1 | -1): HTMLInputElement | null {
  const peers = arrowFieldPeers(current);
  const index = peers.indexOf(current);
  if (index < 0) return null;
  return peers[index + direction] ?? null;
}

export function focusArrowField(el: HTMLInputElement) {
  el.focus({ preventScroll: true });
  try {
    el.select();
  } catch {
    /* Some number inputs refuse select(). */
  }
  el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}
