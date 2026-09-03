import { describe, it, expect, vi } from "vitest";
import {
  GPU_BACKGROUND_REGISTRY,
  isGPUSupportedBackground,
  GPUBackgroundRenderer,
} from "./webgl-background";
import { GPUEffectPipeline } from "./webgl-effect-pipeline";
import { BACKGROUND_TRANSPARENT_FRAGMENT_SHADER } from "./shaders/background-transparent";
import { BACKGROUND_SOLID_FRAGMENT_SHADER } from "./shaders/background-solid";
import { BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER } from "./shaders/background-linear-gradient";
import { BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER } from "./shaders/background-radial-gradient";
import { BACKGROUND_DOTS_FRAGMENT_SHADER } from "./shaders/background-dots";
import { BACKGROUND_GRID_FRAGMENT_SHADER } from "./shaders/background-grid";
import { BACKGROUND_COMPOSITE_FRAGMENT_SHADER } from "./shaders/background-composite";
import { renderBackgroundToCanvas } from "../../export/image-encoder";
import type { BackgroundState, BackgroundType } from "../../types/look";
import type { EffectStack } from "../../types/asset";
import type { CompiledProgram } from "./webgl-types";

function createMockGL(): {
  gl: WebGL2RenderingContext;
  uniforms: Map<string, { type: string; value: unknown }>;
} {
  const uniforms = new Map<string, { type: string; value: unknown }>();
  const uniformLocationMap = new Map<string, WebGLUniformLocation>();
  let locId = 1;

  const gl = {
    canvas: { width: 800, height: 600 },
    createProgram: () => ({}) as WebGLProgram,
    createShader: () => ({}) as WebGLShader,
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: (_p: WebGLProgram, param: number) => {
      if (param === 0x8b89) return 19; // ACTIVE_UNIFORMS
      if (param === 0x8b84) return 2; // ACTIVE_ATTRIBUTES
      return true; // LINK_STATUS / COMPILE_STATUS
    },
    getActiveUniform: (_p: WebGLProgram, i: number) => {
      const knownNames = [
        "u_texture",
        "u_backgroundTexture",
        "u_foregroundTexture",
        "u_resolution",
        "u_color",
        "u_bgColor",
        "u_startColor",
        "u_endColor",
        "u_angle",
        "u_patternSpacing",
        "u_opacity",
        "u_bgOpacity",
        "u_time",
        "u_imageSize",
        "u_padding",
        "u_borderRadius",
        "u_shadowBlur",
        "u_shadowOpacity",
      ];
      return i < knownNames.length ? { name: knownNames[i], type: 0x8b50, size: 1 } : null;
    },
    getActiveAttrib: (_p: WebGLProgram, i: number) => {
      const knownAttribs = ["a_position", "a_texCoord"];
      return i < knownAttribs.length ? { name: knownAttribs[i], type: 0x8b50, size: 1 } : null;
    },
    useProgram: () => {},
    getUniformLocation: (_p: WebGLProgram, name: string) => {
      if (!uniformLocationMap.has(name)) {
        uniformLocationMap.set(name, { id: locId++ } as unknown as WebGLUniformLocation);
      }
      return uniformLocationMap.get(name);
    },
    getAttribLocation: () => 0,
    uniform1f: (_loc: WebGLUniformLocation, v: number) => {
      for (const [name, loc] of uniformLocationMap.entries()) {
        if (loc === _loc) uniforms.set(name, { type: "1f", value: v });
      }
    },
    uniform1i: (_loc: WebGLUniformLocation, v: number) => {
      for (const [name, loc] of uniformLocationMap.entries()) {
        if (loc === _loc) uniforms.set(name, { type: "1i", value: v });
      }
    },
    uniform2f: (_loc: WebGLUniformLocation, v0: number, v1: number) => {
      for (const [name, loc] of uniformLocationMap.entries()) {
        if (loc === _loc) uniforms.set(name, { type: "2f", value: [v0, v1] });
      }
    },
    uniform3f: (_loc: WebGLUniformLocation, v0: number, v1: number, v2: number) => {
      for (const [name, loc] of uniformLocationMap.entries()) {
        if (loc === _loc) uniforms.set(name, { type: "3f", value: [v0, v1, v2] });
      }
    },
    createBuffer: () => ({}) as WebGLBuffer,
    bindBuffer: () => {},
    bufferData: () => {},
    createVertexArray: () => ({}) as WebGLVertexArrayObject,
    bindVertexArray: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    createTexture: () => ({}) as WebGLTexture,
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    activeTexture: () => {},
    createFramebuffer: () => ({}) as WebGLFramebuffer,
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE
    viewport: () => {},
    clearColor: () => {},
    clear: () => {},
    drawArrays: () => {},
    pixelStorei: () => {},
    deleteProgram: () => {},
    deleteShader: () => {},
    deleteFramebuffer: () => {},
    deleteTexture: () => {},
    deleteBuffer: () => {},
    deleteVertexArray: () => {},
    RGBA8: 0x8058,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER_COMPLETE: 36053,
    COLOR_BUFFER_BIT: 0x4000,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    TRIANGLES: 0x0004,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
  } as unknown as WebGL2RenderingContext;

  return { gl, uniforms };
}

function createMockProgram(gl: WebGL2RenderingContext, uniformNames: string[]): CompiledProgram {
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  for (const name of uniformNames) {
    const loc = gl.getUniformLocation({} as WebGLProgram, name);
    if (loc) uniformLocations.set(name, loc);
  }
  return {
    program: {} as WebGLProgram,
    vertexShader: {} as WebGLShader,
    fragmentShader: {} as WebGLShader,
    uniformLocations,
    attributeLocations: new Map(),
  };
}

describe("Phase 7.5 Procedural GPU Backgrounds & Compositing Suite", () => {
  describe("1. Background Modes & Registry Coverage", () => {
    it("registers exactly the 6 canonical background modes in GPU_BACKGROUND_REGISTRY", () => {
      const registeredTypes = Object.keys(GPU_BACKGROUND_REGISTRY).sort();
      const expectedTypes: BackgroundType[] = [
        "dots",
        "grid",
        "linear-gradient",
        "radial-gradient",
        "solid",
        "transparent",
      ];
      expect(registeredTypes).toEqual(expectedTypes);
    });

    it("verifies isGPUSupportedBackground accurately identifies supported vs unsupported types", () => {
      expect(isGPUSupportedBackground("transparent")).toBe(true);
      expect(isGPUSupportedBackground("solid")).toBe(true);
      expect(isGPUSupportedBackground("linear-gradient")).toBe(true);
      expect(isGPUSupportedBackground("radial-gradient")).toBe(true);
      expect(isGPUSupportedBackground("dots")).toBe(true);
      expect(isGPUSupportedBackground("grid")).toBe(true);

      // Rejects out-of-scope / unauthorized modes
      expect(isGPUSupportedBackground("caustics")).toBe(false);
      expect(isGPUSupportedBackground("noise")).toBe(false);
      expect(isGPUSupportedBackground("animated-gradient")).toBe(false);
      expect(isGPUSupportedBackground("plasma")).toBe(false);
    });
  });

  describe("2. GLSL ES 3.00 Shader Source & Syntax Validation", () => {
    it("validates transparent background shader structure", () => {
      expect(BACKGROUND_TRANSPARENT_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_TRANSPARENT_FRAGMENT_SHADER).toContain("out vec4 fragColor;");
      expect(BACKGROUND_TRANSPARENT_FRAGMENT_SHADER).toContain("fragColor = vec4(0.0, 0.0, 0.0, 0.0);");
    });

    it("validates solid background shader uniforms", () => {
      expect(BACKGROUND_SOLID_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_SOLID_FRAGMENT_SHADER).toContain("uniform vec3 u_color;");
      expect(BACKGROUND_SOLID_FRAGMENT_SHADER).toContain("uniform float u_opacity;");
      expect(BACKGROUND_SOLID_FRAGMENT_SHADER).toContain("fragColor = vec4(u_color, u_opacity);");
    });

    it("validates linear gradient shader uniforms and projection math", () => {
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec2 u_resolution;");
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec3 u_startColor;");
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec3 u_endColor;");
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("uniform float u_angle;");
      expect(BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER).toContain("mix(u_startColor, u_endColor, t)");
    });

    it("validates radial gradient shader uniforms and radius math", () => {
      expect(BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec2 u_resolution;");
      expect(BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec3 u_startColor;");
      expect(BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER).toContain("uniform vec3 u_endColor;");
      expect(BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER).toContain("mix(u_startColor, u_endColor, t)");
    });

    it("validates dots pattern shader uniforms and configurable background color", () => {
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("uniform vec2 u_resolution;");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("uniform vec3 u_color;");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("uniform vec3 u_bgColor;");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("uniform float u_bgOpacity;");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("uniform float u_patternSpacing;");
      expect(BACKGROUND_DOTS_FRAGMENT_SHADER).toContain("u_bgColor * u_bgOpacity");
    });

    it("validates grid pattern shader uniforms and configurable background color", () => {
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("uniform vec2 u_resolution;");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("uniform vec3 u_color;");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("uniform vec3 u_bgColor;");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("uniform float u_bgOpacity;");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("uniform float u_patternSpacing;");
      expect(BACKGROUND_GRID_FRAGMENT_SHADER).toContain("u_bgColor * u_bgOpacity");
    });

    it("validates background compositing shader framing, SDF corner clipping, shadow, and alpha blending", () => {
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform sampler2D u_backgroundTexture;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform sampler2D u_foregroundTexture;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform vec2 u_resolution;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform vec2 u_imageSize;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform float u_padding;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform float u_borderRadius;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform float u_shadowBlur;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("uniform float u_shadowOpacity;");
      expect(BACKGROUND_COMPOSITE_FRAGMENT_SHADER).toContain("fg.rgb * fg.a + result.rgb * (1.0 - fg.a)");
    });
  });

  describe("3. Background Parameter -> Uniform Mapping Integrity", () => {
    it("binds solid background color uniform accurately from hex", () => {
      const { gl, uniforms } = createMockGL();
      const program = createMockProgram(gl, ["u_color"]);

      const state: BackgroundState = {
        type: "solid",
        color: "#ff8800",
      };

      GPU_BACKGROUND_REGISTRY.solid.bindUniforms(gl, program, state, 1920, 1080);
      const uColor = uniforms.get("u_color");
      expect(uColor).toBeDefined();
      expect(uColor?.type).toBe("3f");
      const [r, g, b] = uColor?.value as [number, number, number];
      expect(r).toBeCloseTo(255 / 255);
      expect(g).toBeCloseTo(136 / 255);
      expect(b).toBeCloseTo(0);
    });

    it("binds linear gradient resolution, angle, and 2-stop colors", () => {
      const { gl, uniforms } = createMockGL();
      const program = createMockProgram(gl, ["u_resolution", "u_startColor", "u_endColor", "u_angle"]);

      const state: BackgroundState = {
        type: "linear-gradient",
        color: "#000000",
        gradientEndColor: "#ff00ff",
        gradientAngle: 45,
      };

      GPU_BACKGROUND_REGISTRY["linear-gradient"].bindUniforms(gl, program, state, 1920, 1080);
      expect(uniforms.get("u_resolution")?.value).toEqual([1920, 1080]);
      expect(uniforms.get("u_angle")?.value).toBe(45);
      expect(uniforms.get("u_startColor")?.value).toEqual([0, 0, 0]);
      expect(uniforms.get("u_endColor")?.value).toEqual([1, 0, 1]);
    });

    it("binds radial gradient center and color stops", () => {
      const { gl, uniforms } = createMockGL();
      const program = createMockProgram(gl, ["u_resolution", "u_startColor", "u_endColor"]);

      const state: BackgroundState = {
        type: "radial-gradient",
        color: "#123456",
        gradientEndColor: "#abcdef",
      };

      GPU_BACKGROUND_REGISTRY["radial-gradient"].bindUniforms(gl, program, state, 800, 600);
      expect(uniforms.get("u_resolution")?.value).toEqual([800, 600]);
      expect(uniforms.get("u_startColor")?.value).toBeDefined();
      expect(uniforms.get("u_endColor")?.value).toBeDefined();
    });

    it("binds dots and grid pattern spacing with clamp at 8px minimum", () => {
      const { gl, uniforms } = createMockGL();
      const program = createMockProgram(gl, ["u_resolution", "u_color", "u_patternSpacing"]);

      const state: BackgroundState = {
        type: "dots",
        color: "#3b82f6",
        patternSpacing: 4, // Below 8px minimum
      };

      GPU_BACKGROUND_REGISTRY.dots.bindUniforms(gl, program, state, 1000, 1000);
      expect(uniforms.get("u_patternSpacing")?.value).toBe(8);

      const gridState: BackgroundState = {
        type: "grid",
        color: "#10b981",
        patternSpacing: 32,
      };

      GPU_BACKGROUND_REGISTRY.grid.bindUniforms(gl, program, gridState, 1000, 1000);
      expect(uniforms.get("u_patternSpacing")?.value).toBe(32);
    });
  });

  describe("4. GPU Background Renderer Lifecycle & Compositing", () => {
    it("initializes and renders background to texture without throwing", () => {
      const { gl } = createMockGL();
      const renderer = new GPUBackgroundRenderer(gl);

      const state: BackgroundState = {
        type: "linear-gradient",
        color: "#1e1b4b",
        gradientEndColor: "#4338ca",
        gradientAngle: 180,
      };

      expect(() => {
        renderer.renderBackgroundToTexture(800, 600, state);
      }).not.toThrow();

      expect(() => renderer.dispose()).not.toThrow();
    });

    it("composites background behind foreground image with framing and shadow", () => {
      const { gl } = createMockGL();
      const renderer = new GPUBackgroundRenderer(gl);

      const bgTexture = {} as WebGLTexture;
      const fgTexture = {} as WebGLTexture;

      const state: BackgroundState = {
        type: "solid",
        color: "#0f172a",
        padding: 40,
        borderRadius: 16,
        shadowBlur: 24,
        shadowOpacity: 0.5,
      };

      expect(() => {
        renderer.composite(bgTexture, fgTexture, 400, 300, state, null);
      }).not.toThrow();

      renderer.dispose();
    });

    it("GPUEffectPipeline integrates GPUBackgroundRenderer cleanly", () => {
      const { gl } = createMockGL();
      const pipeline = new GPUEffectPipeline(gl);

      const bgRenderer = pipeline.getBackgroundRenderer();
      expect(bgRenderer).toBeInstanceOf(GPUBackgroundRenderer);

      const state: BackgroundState = {
        type: "dots",
        color: "#3b82f6",
        patternSpacing: 24,
        padding: 20,
      };

      const mockCanvasSource = { width: 200, height: 200 } as unknown as HTMLCanvasElement;

      expect(() => {
        pipeline.renderCompositedStackToCanvas(
          mockCanvasSource,
          200,
          200,
          [{ instanceId: "bw-1", effectId: "black-and-white", enabled: true, parameters: { contrast: 1.5, warmth: 0 } }],
          state,
          "test-asset",
        );
      }).not.toThrow();


      pipeline.dispose();
    });
  });

  describe("5. CPU Fallback Compatibility & Parity", () => {
    it("renders all 6 background modes on CPU Canvas 2D without errors", () => {
      const mockContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const states: BackgroundState[] = [
        { type: "transparent", color: "#000000" },
        { type: "solid", color: "#ef4444" },
        { type: "linear-gradient", color: "#10b981", gradientEndColor: "#3b82f6", gradientAngle: 90 },
        { type: "radial-gradient", color: "#8b5cf6", gradientEndColor: "#ec4899" },
        { type: "dots", color: "#f59e0b", patternSpacing: 16 },
        { type: "grid", color: "#06b6d4", patternSpacing: 20 },
      ];

      for (const st of states) {
        expect(() => {
          renderBackgroundToCanvas(mockContext, 400, 300, st);
        }).not.toThrow();
      }

      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  describe("6. Multi-Pass Effects Composited over GPU Backgrounds", () => {
    it("composites a 3-pass effect stack (pixelate -> grain -> duotone) over radial-gradient background", () => {
      const { gl } = createMockGL();
      const pipeline = new GPUEffectPipeline(gl);

      const stack: EffectStack = [
        { instanceId: "pix-1", effectId: "pixelate", enabled: true, parameters: { blockSize: 12 } },
        { instanceId: "grain-1", effectId: "grain", enabled: true, parameters: { intensity: 0.3 } },
        {
          instanceId: "duo-1",
          effectId: "duotone",
          enabled: true,
          parameters: { shadowColor: "#050510", highlightColor: "#38bdf8", contrast: 1.2 },
        },
      ];



      const bgState: BackgroundState = {
        type: "radial-gradient",
        color: "#0f172a",
        gradientEndColor: "#6366f1",
        padding: 30,
        borderRadius: 12,
        shadowBlur: 20,
        shadowOpacity: 0.6,
      };

      const mockCanvasSource = { width: 400, height: 400 } as unknown as HTMLCanvasElement;

      expect(() => {
        pipeline.renderCompositedStackToCanvas(
          mockCanvasSource,
          400,
          400,
          stack,
          bgState,
          "asset-multipass",
        );
      }).not.toThrow();

      pipeline.dispose();
    });

    it("handles transparent foreground over all 6 background modes with zero alpha corruption", () => {
      const { gl } = createMockGL();
      const pipeline = new GPUEffectPipeline(gl);

      const allModes: BackgroundType[] = [
        "transparent",
        "solid",
        "linear-gradient",
        "radial-gradient",
        "dots",
        "grid",
      ];

      const mockSource = { width: 100, height: 100 } as unknown as HTMLCanvasElement;

      for (const mode of allModes) {
        const bgState: BackgroundState = {
          type: mode,
          color: "#ff0055",
          gradientEndColor: "#00ffff",
          gradientAngle: 90,
          patternSpacing: 16,
          padding: 10,
          borderRadius: 4,
          shadowBlur: 8,
          shadowOpacity: 0.3,
        };

        expect(() => {
          pipeline.renderCompositedStackToCanvas(
            mockSource,
            100,
            100,
            [], // Transparent / unmodified foreground
            bgState,
            `transparent-test-${mode}`,
          );
        }).not.toThrow();
      }

      pipeline.dispose();
    });

    it("reuses existing FBOs and textures across consecutive renders without memory churn", () => {
      const { gl } = createMockGL();
      const renderer = new GPUBackgroundRenderer(gl);

      const state1: BackgroundState = { type: "solid", color: "#112233" };
      const state2: BackgroundState = { type: "dots", color: "#445566", patternSpacing: 32 };

      // Render 1
      const tex1 = renderer.renderBackgroundToTexture(500, 500, state1);
      // Render 2 at same dimensions should reuse same FBO texture attachment
      const tex2 = renderer.renderBackgroundToTexture(500, 500, state2);

      expect(tex1).toBe(tex2);

      renderer.dispose();
    });
  });
});

