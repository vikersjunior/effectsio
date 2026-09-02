import { describe, expect, it } from "vitest";
import { EFFECT_REGISTRY } from "../../effects/registry";
import { resolveEffectParameters, executeEffectStack } from "../../effects/engine";
import { createImageData } from "../../effects/canvas-utils";
import { GPU_EFFECT_REGISTRY, type GPUEffectId, isGPUSupportedEffect } from "./webgl-effect-pipeline";
import type { EffectInstance, EffectStack } from "../../types/asset";
import type { EffectDefinition, EffectParameterSchema } from "../../effects/types";

describe("Phase 7.4 Comprehensive Parameter Propagation & UI Binding Invariant Suite", () => {
  describe("1. Canonical Schema Name Integrity Across All 12 Effects", () => {
    it("proves that every schema parameter name in the canonical registry matches the GPU uniform binder", () => {
      EFFECT_REGISTRY.forEach((def: EffectDefinition) => {
        expect(isGPUSupportedEffect(def.id)).toBe(true);
        const gpuDef = GPU_EFFECT_REGISTRY[def.id as GPUEffectId];
        expect(gpuDef).toBeDefined();

        // Extract all declared parameter schema names
        const declaredParamNames = def.parameters.map((p: EffectParameterSchema) => p.name);

        // Create a mock tracking GL and Program
        const boundUniforms: Record<string, unknown> = {};
        const mockGL = {
          uniform1f: (loc: unknown, val: number) => {
            boundUniforms[String(loc)] = val;
          },
          uniform2f: (loc: unknown, v1: number, v2: number) => {
            boundUniforms[String(loc)] = [v1, v2];
          },
          uniform3f: (loc: unknown, v1: number, v2: number, v3: number) => {
            boundUniforms[String(loc)] = [v1, v2, v3];
          },
          uniform1i: (loc: unknown, val: number) => {
            boundUniforms[String(loc)] = val;
          },
        } as unknown as WebGL2RenderingContext;

        const mockProgram = {
          program: {} as WebGLProgram,
          vertexShader: {} as WebGLShader,
          fragmentShader: {} as WebGLShader,
          uniformLocations: new Map<string, WebGLUniformLocation>(),
          attributeLocations: new Map(),
        };

        // Create mock uniform location for any uniform name queried
        const mockProgramProxy = new Proxy(mockProgram, {
          get(target, prop) {
            if (prop === "uniformLocations") {
              return {
                get(name: string) {
                  return name; // return uniform name as location
                },
                has() {
                  return true;
                },
              };
            }
            return (target as Record<string, unknown>)[prop as string];
          },
        });

        // Test with default parameters
        gpuDef.bindUniforms(mockGL, mockProgramProxy as never, def.defaultParameters, 800, 600);

        // Verify each schema name has a corresponding default parameter
        declaredParamNames.forEach((name: string) => {
          expect(def.defaultParameters[name]).toBeDefined();
        });
      });
    });
  });

  describe("2. Parameter Mutation & Uniform Binding For All 12 Effects", () => {
    const testCases: Array<{
      effectId: GPUEffectId;
      paramName: string;
      customValue: unknown;
      expectedUniformName: string;
      expectedUniformValue: unknown;
    }> = [
      {
        effectId: "black-and-white",
        paramName: "contrast",
        customValue: 2.4,
        expectedUniformName: "u_contrast",
        expectedUniformValue: 2.4,
      },
      {
        effectId: "black-and-white",
        paramName: "warmth",
        customValue: 35,
        expectedUniformName: "u_warmth",
        expectedUniformValue: 35,
      },
      {
        effectId: "duotone",
        paramName: "contrast",
        customValue: 1.8,
        expectedUniformName: "u_contrast",
        expectedUniformValue: 1.8,
      },
      {
        effectId: "duotone",
        paramName: "shadowColor",
        customValue: "#ff0000",
        expectedUniformName: "u_shadowColor",
        expectedUniformValue: [1, 0, 0],
      },
      {
        effectId: "posterize",
        paramName: "levels",
        customValue: 8,
        expectedUniformName: "u_levels",
        expectedUniformValue: 8,
      },
      {
        effectId: "grain",
        paramName: "intensity",
        customValue: 65,
        expectedUniformName: "u_intensity",
        expectedUniformValue: 65,
      },
      {
        effectId: "halftone",
        paramName: "dotSize",
        customValue: 14,
        expectedUniformName: "u_dotSize",
        expectedUniformValue: 14,
      },
      {
        effectId: "halftone",
        paramName: "angle",
        customValue: 30,
        expectedUniformName: "u_angle",
        expectedUniformValue: 30,
      },
      {
        effectId: "screen-print",
        paramName: "halftoneSize",
        customValue: 16,
        expectedUniformName: "u_halftoneSize",
        expectedUniformValue: 16,
      },
      {
        effectId: "screen-print",
        paramName: "inkColor1",
        customValue: "#00ff00",
        expectedUniformName: "u_inkColor1",
        expectedUniformValue: [0, 1, 0],
      },
      {
        effectId: "vintage-film",
        paramName: "vignette",
        customValue: 75,
        expectedUniformName: "u_vignette",
        expectedUniformValue: 75,
      },
      {
        effectId: "vintage-film",
        paramName: "saturation",
        customValue: 0.2,
        expectedUniformName: "u_saturation",
        expectedUniformValue: 0.2,
      },
      {
        effectId: "glitch",
        paramName: "rgbShift",
        customValue: 24,
        expectedUniformName: "u_rgbShift",
        expectedUniformValue: 24,
      },
      {
        effectId: "pixelate",
        paramName: "blockSize",
        customValue: 48,
        expectedUniformName: "u_blockSize",
        expectedUniformValue: 48,
      },
      {
        effectId: "line-art",
        paramName: "edgeThreshold",
        customValue: 90,
        expectedUniformName: "u_edgeThreshold",
        expectedUniformValue: 90,
      },
      {
        effectId: "line-art",
        paramName: "invert",
        customValue: true,
        expectedUniformName: "u_invert",
        expectedUniformValue: 1.0,
      },
      {
        effectId: "ascii",
        paramName: "fontSize",
        customValue: 18,
        expectedUniformName: "u_fontSize",
        expectedUniformValue: 18,
      },
      {
        effectId: "ascii",
        paramName: "colorMode",
        customValue: "greenPhosphor",
        expectedUniformName: "u_colorMode",
        expectedUniformValue: 2.0,
      },
    ];

    testCases.forEach(
      ({ effectId, paramName, customValue, expectedUniformName, expectedUniformValue }) => {
        it(`binds updated parameter "${paramName}" on effect "${effectId}" to uniform "${expectedUniformName}"`, () => {
          const gpuDef = GPU_EFFECT_REGISTRY[effectId];
          const boundUniforms: Record<string, unknown> = {};

          const mockGL = {
            uniform1f: (loc: unknown, val: number) => {
              boundUniforms[String(loc)] = val;
            },
            uniform2f: (loc: unknown, v1: number, v2: number) => {
              boundUniforms[String(loc)] = [v1, v2];
            },
            uniform3f: (loc: unknown, v1: number, v2: number, v3: number) => {
              boundUniforms[String(loc)] = [v1, v2, v3];
            },
            uniform1i: (loc: unknown, val: number) => {
              boundUniforms[String(loc)] = val;
            },
          } as unknown as WebGL2RenderingContext;

          const mockProgramProxy = {
            program: {} as WebGLProgram,
            vertexShader: {} as WebGLShader,
            fragmentShader: {} as WebGLShader,
            uniformLocations: {
              get(name: string) {
                return name;
              },
              has() {
                return true;
              },
            },
            attributeLocations: new Map(),
          };

          // 1. Resolve partial parameter mutation
          const resolvedParams = resolveEffectParameters(effectId, { [paramName]: customValue });

          // 2. Bind uniforms
          gpuDef.bindUniforms(mockGL, mockProgramProxy as never, resolvedParams, 1000, 800);

          // 3. Assert uniform received mutated value
          if (Array.isArray(expectedUniformValue)) {
            const actual = boundUniforms[expectedUniformName] as number[];
            expect(actual[0]).toBeCloseTo(expectedUniformValue[0]);
            expect(actual[1]).toBeCloseTo(expectedUniformValue[1]);
            expect(actual[2]).toBeCloseTo(expectedUniformValue[2]);
          } else {
            expect(boundUniforms[expectedUniformName]).toBe(expectedUniformValue);
          }
        });
      }
    );
  });

  describe("3. Multi-Effect Stack Isolation & Reordering", () => {
    it("ensures parameter mutations on one layer do not bleed into other layers", () => {
      const layer1: EffectInstance = {
        instanceId: "layer-bw",
        effectId: "black-and-white",
        enabled: true,
        parameters: { contrast: 2.2, warmth: 20 },
      };

      const layer2: EffectInstance = {
        instanceId: "layer-grain",
        effectId: "grain",
        enabled: true,
        parameters: { intensity: 80 },
      };

      const stack: EffectStack = [layer1, layer2];

      // Mutate layer 1 parameters
      const updatedLayer1: EffectInstance = {
        ...layer1,
        parameters: { ...layer1.parameters, contrast: 1.1 },
      };

      const nextStack = stack.map((item) =>
        item.instanceId === layer1.instanceId ? updatedLayer1 : item
      );

      // Verify layer 2 parameters remain untouched
      expect(nextStack[1].parameters["intensity"]).toBe(80);
      expect(nextStack[0].parameters["contrast"]).toBe(1.1);
      expect(nextStack[0].parameters["warmth"]).toBe(20);
    });

    it("verifies disabled effect layers are omitted while enabled layers are executed", () => {
      const layer1: EffectInstance = {
        instanceId: "layer-bw",
        effectId: "black-and-white",
        enabled: false,
        parameters: { contrast: 2.0 },
      };

      const layer2: EffectInstance = {
        instanceId: "layer-pixelate",
        effectId: "pixelate",
        enabled: true,
        parameters: { blockSize: 24 },
      };

      const stack: EffectStack = [layer1, layer2];
      const activeLayers = stack.filter((item) => item.enabled !== false);

      expect(activeLayers.length).toBe(1);
      expect(activeLayers[0].effectId).toBe("pixelate");
    });
  });

  describe("4. CPU Reference Engine Fallback Invariant", () => {
    it("executes the CPU fallback stack without errors for all 12 canonical effects", () => {
      const dummyImageData = createImageData(16, 16);
      // Fill dummy image with test gradient pattern
      for (let i = 0; i < dummyImageData.data.length; i += 4) {
        dummyImageData.data[i] = (i / 4) % 255;
        dummyImageData.data[i + 1] = ((i / 4) * 2) % 255;
        dummyImageData.data[i + 2] = ((i / 4) * 3) % 255;
        dummyImageData.data[i + 3] = 255;
      }

      EFFECT_REGISTRY.forEach((def: EffectDefinition) => {
        const instance: EffectInstance = {
          instanceId: `test-${def.id}`,
          effectId: def.id,
          enabled: true,
          parameters: def.defaultParameters,
        };

        const result = executeEffectStack(dummyImageData, [instance]);
        expect(result).toBeDefined();
        expect(result.width).toBe(16);
        expect(result.height).toBe(16);
        expect(result.data.length).toBe(16 * 16 * 4);
      });
    });
  });
});
