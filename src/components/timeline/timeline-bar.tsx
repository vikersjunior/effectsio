import * as React from "react";
import {
  PlayIcon,
  PauseIcon,
  ArrowCounterClockwiseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  RepeatIcon,
  GaugeIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Slider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Separator,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { formatTimelineTime } from "../../types/animation";

export function TimelineBar(): React.JSX.Element {
  const {
    timeline,
    togglePlayback,
    seek,
    stepFrame,
    resetTimeline,
    setTimelineLoop,
    setTimelineSpeed,
  } = useStudioStore();

  const isPlaying = timeline.playbackState === "playing";

  const cycleSpeed = () => {
    if (timeline.speed === 0.5) setTimelineSpeed(1.0);
    else if (timeline.speed === 1.0) setTimelineSpeed(2.0);
    else if (timeline.speed === 2.0) setTimelineSpeed(0.5);
    else setTimelineSpeed(1.0);
  };

  return (
    <div
      role="region"
      aria-label="Animation Timeline Controls"
      className="floating-popup-surface flex items-center gap-2 rounded-xl border border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] px-3 py-1.5 shadow-2xl backdrop-blur-2xl text-[color:var(--foreground)] w-full max-w-[620px] min-w-[380px] select-none"
    >
      {/* Play / Pause Toggle Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isPlaying ? "primary" : "secondary"}
              size="icon-xs"
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
            >
              {isPlaying ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
            </Button>
          }
        />
        <TooltipContent side="top">{isPlaying ? "Pause (Space)" : "Play (Space)"}</TooltipContent>
      </Tooltip>

      {/* Reset to Start Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={resetTimeline}
              aria-label="Reset timeline"
            >
              <ArrowCounterClockwiseIcon size={12} />
            </Button>
          }
        />
        <TooltipContent side="top">Reset to 0:00</TooltipContent>
      </Tooltip>

      {/* Step Backward */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => stepFrame(-1)}
              aria-label="Step 1 frame backward"
            >
              <SkipBackIcon size={12} />
            </Button>
          }
        />
        <TooltipContent side="top">Step backward</TooltipContent>
      </Tooltip>

      {/* Step Forward */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => stepFrame(1)}
              aria-label="Step 1 frame forward"
            >
              <SkipForwardIcon size={12} />
            </Button>
          }
        />
        <TooltipContent side="top">Step forward</TooltipContent>
      </Tooltip>

      {/* Interactive Timeline Progress Scrub Bar */}
      <div className="flex flex-1 items-center px-1 min-w-[120px]">
        <Slider
          min={0}
          max={timeline.duration}
          step={0.01}
          value={timeline.currentTime}
          onValueChange={(val) => {
            const next = Array.isArray(val) ? val[0] : val;
            if (typeof next === "number") seek(next);
          }}
          getAriaLabel={() => "Timeline scrubber"}
          className="w-full"
        />
      </div>

      {/* High-Precision Formatted Time Display Badge */}
      <span className="font-mono text-2xs text-[color:var(--foreground)] min-w-[5.5rem] text-center whitespace-nowrap tabular-nums">
        {formatTimelineTime(timeline.currentTime)} / {formatTimelineTime(timeline.duration)}
      </span>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      {/* Loop Toggle Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={timeline.loop ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setTimelineLoop(!timeline.loop)}
              aria-label={timeline.loop ? "Disable loop playback" : "Enable loop playback"}
            >
              <RepeatIcon size={12} className={timeline.loop ? "text-[color:var(--primary)]" : ""} />
            </Button>
          }
        />
        <TooltipContent side="top">{timeline.loop ? "Loop enabled" : "Loop disabled"}</TooltipContent>
      </Tooltip>

      {/* Playback Speed Multiplier Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="xs"
              onClick={cycleSpeed}
              className="gap-1 font-mono text-2xs px-1.5 h-6"
              aria-label={`Playback speed: ${timeline.speed}x`}
            >
              <GaugeIcon size={11} />
              <span>{timeline.speed}x</span>
            </Button>
          }
        />
        <TooltipContent side="top">Speed (Click to cycle)</TooltipContent>
      </Tooltip>
    </div>
  );
}
