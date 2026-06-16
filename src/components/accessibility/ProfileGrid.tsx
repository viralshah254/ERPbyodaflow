"use client";

import { cn } from "@/lib/utils";
import { PROFILE_META } from "@/lib/accessibility/profiles";
import type { ProfileId } from "@/lib/accessibility/types";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import {
  Accessibility,
  Brain,
  Eye,
  EyeOff,
  Focus,
  Hand,
  Palette,
  Zap,
} from "lucide-react";

const PROFILE_ICONS: Record<ProfileId, React.ComponentType<{ className?: string }>> = {
  "motor-impaired": Hand,
  blind: EyeOff,
  "color-blind": Palette,
  dyslexia: Brain,
  "low-vision": Eye,
  "cognitive-learning": Brain,
  "seizure-epileptic": Zap,
  adhd: Focus,
};

export function ProfileGrid() {
  const activeProfile = useAccessibilityStore((s) => s.activeProfile);
  const applyProfile = useAccessibilityStore((s) => s.applyProfile);

  return (
    <div className="grid grid-cols-2 gap-2">
      {PROFILE_META.map((profile) => {
        const Icon = PROFILE_ICONS[profile.id];
        const active = activeProfile === profile.id;
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => applyProfile(profile.id)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border bg-card"
            )}
            aria-pressed={active}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium leading-tight">{profile.label}</span>
            </div>
            <span className="text-xs text-muted-foreground leading-snug">
              {profile.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProfileGridHeader() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Accessibility className="h-4 w-4 text-primary" />
      <p className="text-sm text-muted-foreground">
        Choose a profile to apply a recommended set of tools.
      </p>
    </div>
  );
}
