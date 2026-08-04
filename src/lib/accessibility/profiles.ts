import type { ProfileId, ToolSettings } from "./types";
import { DEFAULT_TOOLS } from "./types";

export type ProfileMeta = {
  id: ProfileId;
  label: string;
  description: string;
};

export const PROFILE_META: ProfileMeta[] = [
  {
    id: "motor-impaired",
    label: "Motor Impaired",
    description: "Larger targets, big cursor, and reduced motion",
  },
  {
    id: "blind",
    label: "Blind",
    description: "Screen reader enhancements and page structure",
  },
  {
    id: "color-blind",
    label: "Color Blind",
    description: "Smart contrast and saturation adjustments",
  },
  {
    id: "dyslexia",
    label: "Dyslexia",
    description: "Dyslexia-friendly font, spacing, and line height",
  },
  {
    id: "low-vision",
    label: "Low Vision",
    description: "Bigger text, high contrast, and highlighted links",
  },
  {
    id: "cognitive-learning",
    label: "Cognitive & Learning",
    description: "Reduced motion, tooltips, and simplified visuals",
  },
  {
    id: "seizure-epileptic",
    label: "Seizure & Epileptic",
    description: "Pause animations and lower saturation",
  },
  {
    id: "adhd",
    label: "ADHD",
    description: "Reduced distractions with motion and image controls",
  },
];

export function getProfileTools(profileId: ProfileId): ToolSettings {
  const base = { ...DEFAULT_TOOLS };

  switch (profileId) {
    case "motor-impaired":
      return {
        ...base,
        bigCursor: true,
        pauseAnimations: true,
        oversizedTargets: true,
      };
    case "blind":
      return {
        ...base,
        screenReader: true,
        pageStructure: true,
        highlightLinks: true,
      };
    case "color-blind":
      return {
        ...base,
        smartContrast: true,
        saturation: 50,
      };
    case "dyslexia":
      return {
        ...base,
        dyslexiaFriendly: true,
        textSpacing: true,
        lineHeight: 2,
        textAlign: "left",
      };
    case "low-vision":
      return {
        ...base,
        biggerText: 2,
        contrastPlus: true,
        highlightLinks: true,
      };
    case "cognitive-learning":
      return {
        ...base,
        pauseAnimations: true,
        tooltips: true,
        hideImages: true,
      };
    case "seizure-epileptic":
      return {
        ...base,
        pauseAnimations: true,
        saturation: 30,
      };
    case "adhd":
      return {
        ...base,
        pauseAnimations: true,
        highlightLinks: true,
        hideImages: true,
      };
    default:
      return base;
  }
}
