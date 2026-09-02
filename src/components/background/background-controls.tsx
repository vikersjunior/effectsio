import * as React from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  Button,
  PanelSection,
  SegmentedControl,
  ColorControl,
  PaletteControl,
  GradientControl,
  SliderControl,
  findPaletteValueFromHex,
  getPaletteHex,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import type { BackgroundType } from "../../types/look";
import type { GradientStop, GradientType } from "../ui/controls/control-types";

const BACKGROUND_OPTIONS = [
  { label: "Alpha", value: "transparent" },
  { label: "Solid", value: "solid" },
  { label: "Linear", value: "linear-gradient" },
  { label: "Radial", value: "radial-gradient" },
  { label: "Dots", value: "dots" },
  { label: "Grid", value: "grid" },
];

export function BackgroundControls(): React.JSX.Element {
  const {
    activeAsset,
    activeBackground,
    updateActiveBackground,
    resetActiveBackground,
  } = useStudioStore();

  if (!activeAsset) {
    return (
      <div className="p-8 text-center text-xs text-[color:var(--muted-foreground)]">
        Select an asset to customize its creative background layer.
      </div>
    );
  }

  const isGradient =
    activeBackground.type === "linear-gradient" ||
    activeBackground.type === "radial-gradient";

  const gradientStops: GradientStop[] = [
    {
      color: activeBackground.color || "#000000",
      position: "0%",
      opacity: 100,
    },
    {
      color: activeBackground.gradientEndColor || "#3b82f6",
      position: "100%",
      opacity: 100,
    },
  ];

  const gradientType: GradientType =
    activeBackground.type === "radial-gradient" ? "radial" : "linear";

  return (
    <div className="flex flex-col p-4 gap-3">
      {/* Background Fill Section */}
      <PanelSection
        title="Background Fill"
        collapsible={false}
        action={
          <Button
            variant="ghost"
            size="xs"
            onClick={resetActiveBackground}
            className="gap-1 text-2xs"
            title="Reset backdrop to default"
          >
            <ArrowCounterClockwiseIcon size={11} />
            Reset
          </Button>
        }
      >
        <SegmentedControl
          name="Backdrop Type"
          value={activeBackground.type}
          options={BACKGROUND_OPTIONS}
          onValueChange={(val) =>
            updateActiveBackground({ type: val as BackgroundType })
          }
        />

        {activeBackground.type !== "transparent" && (
          <div className="flex flex-col gap-3 pt-2">
            {isGradient ? (
              /* Canonical EffectsIO Gradient Control */
              <GradientControl
                name="Backdrop Gradient"
                angle={activeBackground.gradientAngle ?? 135}
                gradientType={gradientType}
                stops={gradientStops}
                onValueChange={({ angle, gradientType: nextType, stops }) => {
                  const firstStop = stops[0];
                  const lastStop = stops[stops.length - 1];
                  const nextBgType: BackgroundType =
                    nextType === "radial"
                      ? "radial-gradient"
                      : "linear-gradient";

                  updateActiveBackground({
                    type: nextBgType,
                    color: firstStop?.color ?? activeBackground.color,
                    gradientEndColor:
                      lastStop?.color ?? activeBackground.gradientEndColor,
                    gradientAngle: angle,
                  });
                }}
              />
            ) : (
              /* Solid / Pattern Backdrop Color Controls */
              <div className="flex flex-col gap-3">
                {/* Canonical Preset Palette Control */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    Preset Palette
                  </span>
                  <div className="rounded-lg border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_30%,transparent)] p-1">
                    <PaletteControl
                      variant="panel"
                      value={findPaletteValueFromHex(
                        activeBackground.color || "#000000",
                      )}
                      onValueChange={(val, meta) => {
                        const hex = meta?.hex ?? getPaletteHex(val);
                        updateActiveBackground({ color: hex });
                      }}
                    />
                  </div>
                </div>

                {/* Free Hex Color Control */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-2xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    Custom Color
                  </span>
                  <ColorControl
                    name="Hex Value"
                    value={activeBackground.color || "#000000"}
                    onValueChange={(hex) =>
                      updateActiveBackground({ color: hex })
                    }
                  />
                </div>

                {(activeBackground.type === "dots" ||
                  activeBackground.type === "grid") && (
                  <SliderControl
                    name="Pattern Spacing"
                    value={activeBackground.patternSpacing ?? 24}
                    min={8}
                    max={64}
                    step={2}
                    unit="px"
                    onValueChange={(val) =>
                      updateActiveBackground({ patternSpacing: val })
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      </PanelSection>

      {/* Canvas Framing & Padding */}
      <PanelSection title="Framing & Shadow" collapsible={true}>
        <SliderControl
          name="Canvas Margin"
          value={activeBackground.padding ?? 0}
          min={0}
          max={120}
          step={4}
          unit="px"
          onValueChange={(val) => updateActiveBackground({ padding: val })}
        />

        {(activeBackground.padding ?? 0) > 0 && (
          <div className="flex flex-col gap-3 pt-1">
            <SliderControl
              name="Corner Radius"
              value={activeBackground.borderRadius ?? 0}
              min={0}
              max={48}
              step={2}
              unit="px"
              onValueChange={(val) =>
                updateActiveBackground({ borderRadius: val })
              }
            />

            <SliderControl
              name="Shadow Blur"
              value={activeBackground.shadowBlur ?? 16}
              min={0}
              max={64}
              step={2}
              unit="px"
              onValueChange={(val) =>
                updateActiveBackground({ shadowBlur: val })
              }
            />

            <SliderControl
              name="Shadow Opacity"
              value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              onValueChange={(val) =>
                updateActiveBackground({ shadowOpacity: val / 100 })
              }
            />
          </div>
        )}
      </PanelSection>
    </div>
  );
}
