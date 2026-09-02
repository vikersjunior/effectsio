import { describe, it, expect } from "vitest";
import { GPU_EFFECT_REGISTRY, isGPUSupportedEffect } from "./webgl-effect-pipeline";
import { GPU_BACKGROUND_REGISTRY, isGPUSupportedBackground } from "./webgl-background";
import { formatTimelineTime, normalizeTimelineTime, DEFAULT_ANIMATION_STATE } from "../../types/animation";
import { executeEffectStack, applyEffect } from "../../effects/engine";
import { createImageData } from "../../effects/canvas-utils";
import type { EffectStack } from "../../types/asset";
import type { BackgroundState } from "../../types/look";

describe("Phase 7.6 Animation Engine & Timeline Suite", () => {
  describe("1. Time Uniform (u_time) Propagation in Effect Shaders", () => {
    it("propagates u_time uniform accurately to all registered GPU effects", () => {
      const boundUniforms: Record<string, number | number[]> = {};
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          boundUniforms[loc as unknown as string] = val;
        },
        uniform2f: (loc: WebGLUniformLocation, x: number, y: number) => {
          boundUniforms[loc as unknown as string] = [x, y];
        },
        uniform3f: (loc: WebGLUniformLocation, x: number, y: number, z: number) => {
          boundUniforms[loc as unknown as string] = [x, y, z];
        },
      } as unknown as WebGL2RenderingContext;

      const effectIds = Object.keys(GPU_EFFECT_REGISTRY) as (keyof typeof GPU_EFFECT_REGISTRY)[];

      for (const id of effectIds) {
        const def = GPU_EFFECT_REGISTRY[id];
        const mockProgram = {
          program: {} as WebGLProgram,
          vertexShader: {} as WebGLShader,
          fragmentShader: {} as WebGLShader,
          uniformLocations: new Map<string, WebGLUniformLocation>([
            ["u_time", "u_time" as unknown as WebGLUniformLocation],
            ["u_resolution", "u_resolution" as unknown as WebGLUniformLocation],
            ["u_contrast", "u_contrast" as unknown as WebGLUniformLocation],
            ["u_warmth", "u_warmth" as unknown as WebGLUniformLocation],
            ["u_intensity", "u_intensity" as unknown as WebGLUniformLocation],
            ["u_rgbShift", "u_rgbShift" as unknown as WebGLUniformLocation],
            ["u_levels", "u_levels" as unknown as WebGLUniformLocation],
            ["u_dotSize", "u_dotSize" as unknown as WebGLUniformLocation],
            ["u_blockSize", "u_blockSize" as unknown as WebGLUniformLocation],
            ["u_edgeThreshold", "u_edgeThreshold" as unknown as WebGLUniformLocation],
            ["u_lineWeight", "u_lineWeight" as unknown as WebGLUniformLocation],
            ["u_invert", "u_invert" as unknown as WebGLUniformLocation],
            ["u_fontSize", "u_fontSize" as unknown as WebGLUniformLocation],
            ["u_characterDensity", "u_characterDensity" as unknown as WebGLUniformLocation],
            ["u_colorMode", "u_colorMode" as unknown as WebGLUniformLocation],
          ]),
          attributeLocations: new Map(),
        };

        const testTime = 4.25;
        def.bindUniforms(mockGL, mockProgram, undefined, 800, 600, testTime);

        expect(boundUniforms["u_time"]).toBe(testTime);
      }
    });
  });

  describe("2. Time Uniform (u_time) Propagation in Background Shaders", () => {
    it("propagates u_time uniform accurately to all procedural GPU backgrounds", () => {
      const boundUniforms: Record<string, number | number[]> = {};
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          boundUniforms[loc as unknown as string] = val;
        },
        uniform2f: (loc: WebGLUniformLocation, x: number, y: number) => {
          boundUniforms[loc as unknown as string] = [x, y];
        },
        uniform3f: (loc: WebGLUniformLocation, x: number, y: number, z: number) => {
          boundUniforms[loc as unknown as string] = [x, y, z];
        },
      } as unknown as WebGL2RenderingContext;

      const bgTypes = Object.keys(GPU_BACKGROUND_REGISTRY) as (keyof typeof GPU_BACKGROUND_REGISTRY)[];

      for (const type of bgTypes) {
        const def = GPU_BACKGROUND_REGISTRY[type];
        const mockProgram = {
          program: {} as WebGLProgram,
          vertexShader: {} as WebGLShader,
          fragmentShader: {} as WebGLShader,
          uniformLocations: new Map<string, WebGLUniformLocation>([
            ["u_time", "u_time" as unknown as WebGLUniformLocation],
            ["u_resolution", "u_resolution" as unknown as WebGLUniformLocation],
            ["u_color", "u_color" as unknown as WebGLUniformLocation],
            ["u_startColor", "u_startColor" as unknown as WebGLUniformLocation],
            ["u_endColor", "u_endColor" as unknown as WebGLUniformLocation],
            ["u_angle", "u_angle" as unknown as WebGLUniformLocation],
            ["u_patternSpacing", "u_patternSpacing" as unknown as WebGLUniformLocation],
          ]),
          attributeLocations: new Map(),
        };

        const testTime = 7.82;
        const state: BackgroundState = {
          type,
          color: "#3b82f6",
          gradientEndColor: "#ef4444",
          gradientAngle: 90,
          patternSpacing: 32,
        };

        def.bindUniforms(mockGL, mockProgram, state, 1024, 768, testTime);

        expect(boundUniforms["u_time"]).toBe(testTime);
      }
    });
  });

  describe("3. Determinism & Multi-Pass Time Consistency", () => {
    it("guarantees identical u_time binding for multiple evaluations at the exact same timeline position", () => {
      const timesRecorded: number[] = [];
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          if ((loc as unknown as string) === "u_time") {
            timesRecorded.push(val);
          }
        },
        uniform2f: () => {},
        uniform3f: () => {},
      } as unknown as WebGL2RenderingContext;

      const mockProgram = {
        program: {} as WebGLProgram,
        vertexShader: {} as WebGLShader,
        fragmentShader: {} as WebGLShader,
        uniformLocations: new Map<string, WebGLUniformLocation>([
          ["u_time", "u_time" as unknown as WebGLUniformLocation],
          ["u_resolution", "u_resolution" as unknown as WebGLUniformLocation],
          ["u_intensity", "u_intensity" as unknown as WebGLUniformLocation],
        ]),
        attributeLocations: new Map(),
      };

      const targetTime = 3.14159;

      // First pass at targetTime
      GPU_EFFECT_REGISTRY["glitch"].bindUniforms(mockGL, mockProgram, { intensity: 40 }, 800, 600, targetTime);

      // Second pass after simulated other renders
      GPU_EFFECT_REGISTRY["glitch"].bindUniforms(mockGL, mockProgram, { intensity: 40 }, 800, 600, 8.5);
      GPU_EFFECT_REGISTRY["glitch"].bindUniforms(mockGL, mockProgram, { intensity: 40 }, 800, 600, targetTime);

      expect(timesRecorded[0]).toBe(targetTime);
      expect(timesRecorded[1]).toBe(8.5);
      expect(timesRecorded[2]).toBe(targetTime);
      expect(timesRecorded[0]).toBe(timesRecorded[2]);
    });

    it("guarantees multi-pass stack layers all receive the identical frameTime within a frame pass", () => {
      const recordedPassTimes: { effect: string; time: number }[] = [];

      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          if ((loc as unknown as string) === "u_time") {
            // Record last pass
          }
        },
        uniform2f: () => {},
        uniform3f: () => {},
      } as unknown as WebGL2RenderingContext;

      const frameTime = 2.75;
      const stack: EffectStack = [
        { instanceId: "1", effectId: "grain", enabled: true, parameters: { intensity: 30 } },
        { instanceId: "2", effectId: "glitch", enabled: true, parameters: { intensity: 50 } },
        { instanceId: "3", effectId: "vintage-film", enabled: true, parameters: { vignette: 40 } },
      ];

      for (const item of stack) {
        const def = GPU_EFFECT_REGISTRY[item.effectId as keyof typeof GPU_EFFECT_REGISTRY];
        const mockProg = {
          program: {} as WebGLProgram,
          vertexShader: {} as WebGLShader,
          fragmentShader: {} as WebGLShader,
          uniformLocations: new Map([["u_time", "u_time" as unknown as WebGLUniformLocation]]),
          attributeLocations: new Map(),
        };

        let passTime = -1;
        const passGL = {
          uniform1f: (_loc: WebGLUniformLocation, val: number) => {
            passTime = val;
          },
          uniform2f: () => {},
          uniform3f: () => {},
        } as unknown as WebGL2RenderingContext;

        def.bindUniforms(passGL, mockProg, item.parameters, 800, 600, frameTime);
        recordedPassTimes.push({ effect: item.effectId, time: passTime });
      }

      expect(recordedPassTimes.length).toBe(3);
      expect(recordedPassTimes.every((p) => p.time === frameTime)).toBe(true);
    });
  });

  describe("4. Timeline Math, Playback Formatting & Seeking", () => {
    it("formats timeline timestamps cleanly as MM:SS.SS", () => {
      expect(formatTimelineTime(0)).toBe("00:00.00");
      expect(formatTimelineTime(1.5)).toBe("00:01.50");
      expect(formatTimelineTime(65.25)).toBe("01:05.25");
      expect(formatTimelineTime(125.0)).toBe("02:05.00");
      expect(formatTimelineTime(-5)).toBe("00:00.00");
      expect(formatTimelineTime(NaN)).toBe("00:00.00");
    });

    it("normalizes timeline seeking position with and without loop", () => {
      const duration = 10.0;

      // Within bounds
      expect(normalizeTimelineTime(4.5, duration, true)).toBe(4.5);
      expect(normalizeTimelineTime(4.5, duration, false)).toBe(4.5);

      // Negative clamp
      expect(normalizeTimelineTime(-2.0, duration, true)).toBe(0);
      expect(normalizeTimelineTime(-2.0, duration, false)).toBe(0);

      // Past duration with loop
      expect(normalizeTimelineTime(12.5, duration, true)).toBeCloseTo(2.5);

      // Past duration without loop (clamped to duration)
      expect(normalizeTimelineTime(12.5, duration, false)).toBe(10.0);
    });

    it("verifies default timeline state constants", () => {
      expect(DEFAULT_ANIMATION_STATE.playbackState).toBe("stopped");
      expect(DEFAULT_ANIMATION_STATE.currentTime).toBe(0);
      expect(DEFAULT_ANIMATION_STATE.duration).toBe(10.0);
      expect(DEFAULT_ANIMATION_STATE.fps).toBe(60);
      expect(DEFAULT_ANIMATION_STATE.loop).toBe(true);
      expect(DEFAULT_ANIMATION_STATE.speed).toBe(1.0);
    });
  });

  describe("5. Parameter Mutation During Animation vs Paused", () => {
    it("simulates parameter mutation during active playback at time t", () => {
      const boundParams: Record<string, unknown> = {};
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          boundParams[loc as unknown as string] = val;
        },
        uniform2f: () => {},
        uniform3f: () => {},
      } as unknown as WebGL2RenderingContext;

      const mockProg = {
        program: {} as WebGLProgram,
        vertexShader: {} as WebGLShader,
        fragmentShader: {} as WebGLShader,
        uniformLocations: new Map([
          ["u_time", "u_time" as unknown as WebGLUniformLocation],
          ["u_contrast", "u_contrast" as unknown as WebGLUniformLocation],
          ["u_warmth", "u_warmth" as unknown as WebGLUniformLocation],
        ]),
        attributeLocations: new Map(),
      };

      // Frame 1: Playing at t=1.2s with contrast=1.0
      GPU_EFFECT_REGISTRY["black-and-white"].bindUniforms(mockGL, mockProg, { contrast: 1.0, warmth: 0 }, 800, 600, 1.2);
      expect(boundParams["u_time"]).toBe(1.2);
      expect(boundParams["u_contrast"]).toBe(1.0);

      // Frame 2: Parameter slider dragged to contrast=2.4 while time advanced to t=1.25s
      GPU_EFFECT_REGISTRY["black-and-white"].bindUniforms(mockGL, mockProg, { contrast: 2.4, warmth: 10 }, 800, 600, 1.25);
      expect(boundParams["u_time"]).toBe(1.25);
      expect(boundParams["u_contrast"]).toBe(2.4);
      expect(boundParams["u_warmth"]).toBe(10);
    });

    it("simulates parameter mutation while paused at fixed time t", () => {
      const boundParams: Record<string, unknown> = {};
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          boundParams[loc as unknown as string] = val;
        },
        uniform2f: () => {},
        uniform3f: () => {},
      } as unknown as WebGL2RenderingContext;

      const mockProg = {
        program: {} as WebGLProgram,
        vertexShader: {} as WebGLShader,
        fragmentShader: {} as WebGLShader,
        uniformLocations: new Map([
          ["u_time", "u_time" as unknown as WebGLUniformLocation],
          ["u_intensity", "u_intensity" as unknown as WebGLUniformLocation],
        ]),
        attributeLocations: new Map(),
      };

      const pausedTime = 5.0;

      // Paused initial frame
      GPU_EFFECT_REGISTRY["grain"].bindUniforms(mockGL, mockProg, { intensity: 20 }, 800, 600, pausedTime);
      expect(boundParams["u_time"]).toBe(5.0);
      expect(boundParams["u_intensity"]).toBe(20);

      // Paused parameter update (intensity slider changed to 75)
      GPU_EFFECT_REGISTRY["grain"].bindUniforms(mockGL, mockProg, { intensity: 75 }, 800, 600, pausedTime);
      expect(boundParams["u_time"]).toBe(5.0); // Time remains strictly paused
      expect(boundParams["u_intensity"]).toBe(75); // Parameter immediately updated
    });
  });

  describe("6. CPU Fallback Execution Compatibility", () => {
    it("executes CPU effect stack with optional time parameter cleanly", () => {
      const img = createImageData(4, 4);
      for (let i = 0; i < 16; i++) {
        img.data.set([100, 150, 200, 255], i * 4);
      }

      const stack: EffectStack = [
        { instanceId: "1", effectId: "black-and-white", enabled: true, parameters: { contrast: 1.5 } },
        { instanceId: "2", effectId: "grain", enabled: true, parameters: { intensity: 40 } },
      ];

      const result = executeEffectStack(img, stack, 3.5);
      expect(result.width).toBe(4);
      expect(result.height).toBe(4);
      expect(result.data.length).toBe(64);

      // Verify alpha remains opaque
      for (let i = 0; i < 16; i++) {
        expect(result.data[i * 4 + 3]).toBe(255);
      }
    });

    it("applies single CPU effect with time parameter", () => {
      const img = createImageData(2, 2);
      img.data.set([50, 100, 150, 255, 60, 110, 160, 255, 70, 120, 170, 255, 80, 130, 180, 255]);

      const result = applyEffect(img, "black-and-white", { contrast: 1.2 }, 1.0);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });
  });
});
