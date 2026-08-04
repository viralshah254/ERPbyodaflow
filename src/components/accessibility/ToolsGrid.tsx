"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { TextAlignValue } from "@/lib/accessibility/types";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  BookOpen,
  Contrast,
  Eye,
  Grip,
  ImageOff,
  Link2,
  Maximize2,
  MousePointer2,
  Pause,
  Sparkles,
  Type,
  Volume2,
} from "lucide-react";

type ToolRowProps = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
};

function ToolRow({ id, label, description, icon: Icon, checked, onCheckedChange }: ToolRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
            {label}
          </Label>
          {description ? (
            <p className="text-xs text-muted-foreground leading-snug">{description}</p>
          ) : null}
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StepControl({
  label,
  value,
  labels,
  onCycle,
}: {
  label: string;
  value: number;
  labels: string[];
  onCycle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <Button type="button" variant="outline" size="sm" onClick={onCycle} className="min-w-[88px]">
        {labels[value] ?? labels[0]}
      </Button>
    </div>
  );
}

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function ToolsGrid() {
  const tools = useAccessibilityStore((s) => s.tools);
  const toggleTool = useAccessibilityStore((s) => s.toggleTool);
  const cycleStepTool = useAccessibilityStore((s) => s.cycleStepTool);
  const setSaturation = useAccessibilityStore((s) => s.setSaturation);
  const setTextAlign = useAccessibilityStore((s) => s.setTextAlign);
  const toggleOversizedWidget = useAccessibilityStore((s) => s.toggleOversizedWidget);

  const textAlignOptions: { value: TextAlignValue; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "inherit", label: "Default", icon: Type },
    { value: "left", label: "Left", icon: AlignLeft },
    { value: "center", label: "Center", icon: AlignCenter },
    { value: "justify", label: "Justify", icon: AlignJustify },
  ];

  return (
    <div className="space-y-5">
      <ToolSection title="Widget">
        <ToolRow
          id="a11y-oversized-widget"
          label="Oversized Widget"
          description="Enlarge the accessibility panel and launcher"
          icon={Maximize2}
          checked={tools.oversizedWidget}
          onCheckedChange={() => toggleOversizedWidget()}
        />
      </ToolSection>

      <ToolSection title="Vision">
        <ToolRow
          id="a11y-smart-contrast"
          label="Smart Contrast"
          icon={Sparkles}
          checked={tools.smartContrast}
          onCheckedChange={() => toggleTool("smartContrast")}
        />
        <ToolRow
          id="a11y-contrast-plus"
          label="Contrast +"
          icon={Contrast}
          checked={tools.contrastPlus}
          onCheckedChange={() => toggleTool("contrastPlus")}
        />
        <ToolRow
          id="a11y-highlight-links"
          label="Highlight Links"
          icon={Link2}
          checked={tools.highlightLinks}
          onCheckedChange={() => toggleTool("highlightLinks")}
        />
        <ToolRow
          id="a11y-hide-images"
          label="Hide Images"
          icon={ImageOff}
          checked={tools.hideImages}
          onCheckedChange={() => toggleTool("hideImages")}
        />
        <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Saturation</span>
            <span className="text-xs text-muted-foreground">{tools.saturation}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={tools.saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Saturation"
          />
        </div>
      </ToolSection>

      <ToolSection title="Reading">
        <StepControl
          label="Bigger Text"
          value={tools.biggerText}
          labels={["Default", "Medium", "Large"]}
          onCycle={() => cycleStepTool("biggerText")}
        />
        <ToolRow
          id="a11y-text-spacing"
          label="Text Spacing"
          icon={Type}
          checked={tools.textSpacing}
          onCheckedChange={() => toggleTool("textSpacing")}
        />
        <ToolRow
          id="a11y-dyslexia"
          label="Dyslexia Friendly"
          icon={BookOpen}
          checked={tools.dyslexiaFriendly}
          onCheckedChange={() => toggleTool("dyslexiaFriendly")}
        />
        <StepControl
          label="Line Height"
          value={tools.lineHeight}
          labels={["Default", "Relaxed", "Loose"]}
          onCycle={() => cycleStepTool("lineHeight")}
        />
        <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
          <span className="mb-2 block text-sm font-medium">Text Align</span>
          <div className="flex flex-wrap gap-1.5">
            {textAlignOptions.map((opt) => {
              const Icon = opt.icon;
              const active = tools.textAlign === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setTextAlign(opt.value)}
                  className="h-8 gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
        <ToolRow
          id="a11y-dictionary"
          label="Dictionary"
          description="Select text on the page, then look up a word"
          icon={BookOpen}
          checked={tools.dictionary}
          onCheckedChange={() => toggleTool("dictionary")}
        />
      </ToolSection>

      <ToolSection title="Motion & Navigation">
        <ToolRow
          id="a11y-pause-animations"
          label="Pause Animations"
          icon={Pause}
          checked={tools.pauseAnimations}
          onCheckedChange={() => toggleTool("pauseAnimations")}
        />
        <ToolRow
          id="a11y-big-cursor"
          label="Cursor (big)"
          icon={MousePointer2}
          checked={tools.bigCursor}
          onCheckedChange={() => toggleTool("bigCursor")}
        />
        <ToolRow
          id="a11y-tooltips"
          label="Tooltips"
          description="Show title attributes on hover"
          icon={Grip}
          checked={tools.tooltips}
          onCheckedChange={() => toggleTool("tooltips")}
        />
        <ToolRow
          id="a11y-page-structure"
          label="Page Structure"
          description="Highlight landmarks and regions"
          icon={Eye}
          checked={tools.pageStructure}
          onCheckedChange={() => toggleTool("pageStructure")}
        />
        <ToolRow
          id="a11y-screen-reader"
          label="Screen Reader"
          description="Skip link and enhanced focus rings"
          icon={Volume2}
          checked={tools.screenReader}
          onCheckedChange={() => toggleTool("screenReader")}
        />
      </ToolSection>
    </div>
  );
}
