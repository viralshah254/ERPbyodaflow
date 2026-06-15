import {
  BIGGER_TEXT_SCALES,
  LINE_HEIGHT_VALUES,
  type AccessibilityPersistedState,
  type ToolSettings,
} from "./types";

const DATA_ATTR_PREFIX = "data-a11y-";

function setDataAttr(el: HTMLElement, name: string, value: string | null) {
  const key = `${DATA_ATTR_PREFIX}${name}`;
  if (value === null || value === "false" || value === "0" || value === "inherit") {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

function setCssVar(el: HTMLElement, name: string, value: string | null) {
  if (value === null) {
    el.style.removeProperty(name);
  } else {
    el.style.setProperty(name, value);
  }
}

export function applyAccessibilityEffects(
  state: Pick<AccessibilityPersistedState, "tools">,
  root: HTMLElement = document.documentElement
) {
  const { tools } = state;
  applyToolEffects(tools, root);
}

export function applyToolEffects(tools: ToolSettings, root: HTMLElement) {
  setDataAttr(root, "pause-animations", tools.pauseAnimations ? "true" : null);
  setDataAttr(root, "smart-contrast", tools.smartContrast ? "true" : null);
  setDataAttr(root, "contrast-plus", tools.contrastPlus ? "true" : null);
  setDataAttr(root, "highlight-links", tools.highlightLinks ? "true" : null);
  setDataAttr(root, "text-spacing", tools.textSpacing ? "true" : null);
  setDataAttr(root, "hide-images", tools.hideImages ? "true" : null);
  setDataAttr(root, "dyslexia-friendly", tools.dyslexiaFriendly ? "true" : null);
  setDataAttr(root, "big-cursor", tools.bigCursor ? "true" : null);
  setDataAttr(root, "tooltips", tools.tooltips ? "true" : null);
  setDataAttr(root, "screen-reader", tools.screenReader ? "true" : null);
  setDataAttr(root, "oversized-targets", tools.oversizedTargets ? "true" : null);

  const fontScale = BIGGER_TEXT_SCALES[tools.biggerText];
  setCssVar(root, "--a11y-font-scale", fontScale === 1 ? null : String(fontScale));
  setDataAttr(root, "bigger-text", tools.biggerText > 0 ? String(tools.biggerText) : null);

  const lineHeight = LINE_HEIGHT_VALUES[tools.lineHeight];
  setCssVar(
    root,
    "--a11y-line-height",
    tools.lineHeight > 0 ? String(lineHeight) : null
  );
  setDataAttr(root, "line-height", tools.lineHeight > 0 ? String(tools.lineHeight) : null);

  setDataAttr(
    root,
    "text-align",
    tools.textAlign !== "inherit" ? tools.textAlign : null
  );

  setCssVar(
    root,
    "--a11y-saturation",
    tools.saturation !== 100 ? `${tools.saturation}%` : null
  );
  setDataAttr(
    root,
    "saturation",
    tools.saturation !== 100 ? String(tools.saturation) : null
  );
}

export function clearAccessibilityEffects(root: HTMLElement = document.documentElement) {
  const attrs = [...root.attributes]
    .map((a) => a.name)
    .filter((name) => name.startsWith(DATA_ATTR_PREFIX));
  for (const attr of attrs) {
    root.removeAttribute(attr);
  }
  root.style.removeProperty("--a11y-font-scale");
  root.style.removeProperty("--a11y-line-height");
  root.style.removeProperty("--a11y-saturation");
}
