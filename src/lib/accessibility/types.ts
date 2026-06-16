export const PROFILE_IDS = [
  "motor-impaired",
  "blind",
  "color-blind",
  "dyslexia",
  "low-vision",
  "cognitive-learning",
  "seizure-epileptic",
  "adhd",
] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export type TextAlignValue = "inherit" | "left" | "center" | "justify";

export type ToolSettings = {
  oversizedWidget: boolean;
  smartContrast: boolean;
  pauseAnimations: boolean;
  screenReader: boolean;
  contrastPlus: boolean;
  highlightLinks: boolean;
  biggerText: 0 | 1 | 2;
  textSpacing: boolean;
  hideImages: boolean;
  dyslexiaFriendly: boolean;
  bigCursor: boolean;
  tooltips: boolean;
  pageStructure: boolean;
  lineHeight: 0 | 1 | 2;
  textAlign: TextAlignValue;
  dictionary: boolean;
  saturation: number;
  oversizedTargets: boolean;
};

export type WidgetSettings = {
  hidden: boolean;
  position: { x: number; y: number } | null;
  oversized: boolean;
};

export type AccessibilityPersistedState = {
  activeProfile: ProfileId | null;
  tools: ToolSettings;
  widget: WidgetSettings;
};

export const DEFAULT_TOOLS: ToolSettings = {
  oversizedWidget: false,
  smartContrast: false,
  pauseAnimations: false,
  screenReader: false,
  contrastPlus: false,
  highlightLinks: false,
  biggerText: 0,
  textSpacing: false,
  hideImages: false,
  dyslexiaFriendly: false,
  bigCursor: false,
  tooltips: false,
  pageStructure: false,
  lineHeight: 0,
  textAlign: "inherit",
  dictionary: false,
  saturation: 100,
  oversizedTargets: false,
};

export const DEFAULT_WIDGET: WidgetSettings = {
  hidden: false,
  position: null,
  oversized: false,
};

export const STORAGE_KEY = "odaflow_a11y_v1";

export const BIGGER_TEXT_SCALES: Record<0 | 1 | 2, number> = {
  0: 1,
  1: 1.15,
  2: 1.3,
};

export const LINE_HEIGHT_VALUES: Record<0 | 1 | 2, number> = {
  0: 1.5,
  1: 1.75,
  2: 2,
};

export type BooleanToolKey = {
  [K in keyof ToolSettings]: ToolSettings[K] extends boolean ? K : never;
}[keyof ToolSettings];

export type StepToolKey = "biggerText" | "lineHeight";
