import { describe, expect, it } from "vitest";
import { applyToolEffects, clearAccessibilityEffects } from "./apply-effects";
import { getProfileTools } from "./profiles";
import { DEFAULT_TOOLS } from "./types";

describe("getProfileTools", () => {
  it("returns defaults for unknown profile handling via switch default", () => {
    const motor = getProfileTools("motor-impaired");
    expect(motor.bigCursor).toBe(true);
    expect(motor.pauseAnimations).toBe(true);
    expect(motor.oversizedTargets).toBe(true);
  });

  it("enables dyslexia reading bundle", () => {
    const dyslexia = getProfileTools("dyslexia");
    expect(dyslexia.dyslexiaFriendly).toBe(true);
    expect(dyslexia.textSpacing).toBe(true);
    expect(dyslexia.lineHeight).toBe(2);
    expect(dyslexia.textAlign).toBe("left");
  });

  it("enables low vision bundle", () => {
    const lowVision = getProfileTools("low-vision");
    expect(lowVision.biggerText).toBe(2);
    expect(lowVision.contrastPlus).toBe(true);
    expect(lowVision.highlightLinks).toBe(true);
  });

  it("sets seizure profile saturation", () => {
    const seizure = getProfileTools("seizure-epileptic");
    expect(seizure.pauseAnimations).toBe(true);
    expect(seizure.saturation).toBe(30);
  });

  it("starts from clean defaults for each profile", () => {
    for (const id of [
      "motor-impaired",
      "blind",
      "color-blind",
      "dyslexia",
      "low-vision",
      "cognitive-learning",
      "seizure-epileptic",
      "adhd",
    ] as const) {
      const tools = getProfileTools(id);
      expect(tools.oversizedWidget).toBe(DEFAULT_TOOLS.oversizedWidget);
    }
  });
});

describe("applyToolEffects", () => {
  it("sets data attributes for enabled boolean tools", () => {
    const root = document.documentElement;
    clearAccessibilityEffects(root);

    applyToolEffects(
      {
        ...DEFAULT_TOOLS,
        pauseAnimations: true,
        highlightLinks: true,
        biggerText: 2,
        saturation: 50,
      },
      root
    );

    expect(root.getAttribute("data-a11y-pause-animations")).toBe("true");
    expect(root.getAttribute("data-a11y-highlight-links")).toBe("true");
    expect(root.getAttribute("data-a11y-bigger-text")).toBe("2");
    expect(root.style.getPropertyValue("--a11y-font-scale")).toBe("1.3");
    expect(root.getAttribute("data-a11y-saturation")).toBe("50");
    expect(root.style.getPropertyValue("--a11y-saturation")).toBe("50%");
  });

  it("removes attributes when tools are disabled", () => {
    const root = document.documentElement;
    applyToolEffects({ ...DEFAULT_TOOLS, pauseAnimations: true }, root);
    expect(root.getAttribute("data-a11y-pause-animations")).toBe("true");

    applyToolEffects({ ...DEFAULT_TOOLS, pauseAnimations: false }, root);
    expect(root.getAttribute("data-a11y-pause-animations")).toBeNull();
  });

  it("clearAccessibilityEffects removes all a11y attrs and vars", () => {
    const root = document.documentElement;
    applyToolEffects(
      {
        ...DEFAULT_TOOLS,
        dyslexiaFriendly: true,
        lineHeight: 1,
        textAlign: "center",
      },
      root
    );

    clearAccessibilityEffects(root);

    expect(root.getAttribute("data-a11y-dyslexia-friendly")).toBeNull();
    expect(root.getAttribute("data-a11y-text-align")).toBeNull();
    expect(root.style.getPropertyValue("--a11y-line-height")).toBe("");
  });
});
