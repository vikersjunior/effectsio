import type { BackgroundState, BackgroundType } from "../../types/look";
import type { CompiledProgram } from "./webgl-types";
import { createProgram, setUniform } from "./webgl-shader";
import { createFullscreenQuad, type FullscreenQuad } from "./webgl-quad";
import { WebGLResourceManager } from "./webgl-resources";
import { parseHexColor } from "../../effects/canvas-utils";

import {
  BACKGROUND_TRANSPARENT_VERTEX_SHADER,
  BACKGROUND_TRANSPARENT_FRAGMENT_SHADER,
} from "./shaders/background-transparent";
import {
  BACKGROUND_SOLID_VERTEX_SHADER,
  BACKGROUND_SOLID_FRAGMENT_SHADER,
} from "./shaders/background-solid";
import {
  BACKGROUND_LINEAR_GRADIENT_VERTEX_SHADER,
  BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER,
} from "./shaders/background-linear-gradient";
import {
  BACKGROUND_RADIAL_GRADIENT_VERTEX_SHADER,
  BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER,
} from "./shaders/background-radial-gradient";
import {
  BACKGROUND_DOTS_VERTEX_SHADER,
  BACKGROUND_DOTS_FRAGMENT_SHADER,
} from "./shaders/background-dots";
import {
  BACKGROUND_GRID_VERTEX_SHADER,
  BACKGROUND_GRID_FRAGMENT_SHADER,
} from "./shaders/background-grid";
import {
  BACKGROUND_COMPOSITE_VERTEX_SHADER,
  BACKGROUND_COMPOSITE_FRAGMENT_SHADER,
} from "./shaders/background-composite";

export interface GPUBackgroundShaderDef {
  type: BackgroundType;
  vertexShader: string;
  fragmentShader: string;
  bindUniforms: (
    gl: WebGL2RenderingContext,
    program: CompiledProgram,
    state: BackgroundState,
    width: number,
    height: number,
    time?: number,
  ) => void;
}

function hexToNormalizedRgb(hex: unknown, fallback: string): [number, number, number] {
  const parsed = parseHexColor(hex, fallback);
  return [parsed.r / 255, parsed.g / 255, parsed.b / 255];
}

export const GPU_BACKGROUND_REGISTRY: Record<BackgroundType, GPUBackgroundShaderDef> = {
  transparent: {
    type: "transparent",
    vertexShader: BACKGROUND_TRANSPARENT_VERTEX_SHADER,
    fragmentShader: BACKGROUND_TRANSPARENT_FRAGMENT_SHADER,
    bindUniforms: (gl, program, _state, _width, _height, time = 0) => {
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  solid: {
    type: "solid",
    vertexShader: BACKGROUND_SOLID_VERTEX_SHADER,
    fragmentShader: BACKGROUND_SOLID_FRAGMENT_SHADER,
    bindUniforms: (gl, program, state, _width, _height, time = 0) => {
      const color = hexToNormalizedRgb(state.color, "#000000");
      const opacity = typeof state.opacity === "number" ? state.opacity / 100 : 1.0;
      setUniform(gl, program, "u_color", { type: "3f", value: color });
      setUniform(gl, program, "u_opacity", { type: "1f", value: opacity });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "linear-gradient": {
    type: "linear-gradient",
    vertexShader: BACKGROUND_LINEAR_GRADIENT_VERTEX_SHADER,
    fragmentShader: BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER,
    bindUniforms: (gl, program, state, width, height, time = 0) => {
      const startColor = hexToNormalizedRgb(state.color, "#000000");
      const endColor = hexToNormalizedRgb(state.gradientEndColor, "#3b82f6");
      const angle = typeof state.gradientAngle === "number" ? state.gradientAngle : 135;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_startColor", { type: "3f", value: startColor });
      setUniform(gl, program, "u_endColor", { type: "3f", value: endColor });
      setUniform(gl, program, "u_angle", { type: "1f", value: angle });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "radial-gradient": {
    type: "radial-gradient",
    vertexShader: BACKGROUND_RADIAL_GRADIENT_VERTEX_SHADER,
    fragmentShader: BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER,
    bindUniforms: (gl, program, state, width, height, time = 0) => {
      const startColor = hexToNormalizedRgb(state.color, "#000000");
      const endColor = hexToNormalizedRgb(state.gradientEndColor, "#3b82f6");

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_startColor", { type: "3f", value: startColor });
      setUniform(gl, program, "u_endColor", { type: "3f", value: endColor });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  dots: {
    type: "dots",
    vertexShader: BACKGROUND_DOTS_VERTEX_SHADER,
    fragmentShader: BACKGROUND_DOTS_FRAGMENT_SHADER,
    bindUniforms: (gl, program, state, width, height, time = 0) => {
      const color = hexToNormalizedRgb(state.color, "#3b82f6");
      const bgColor = hexToNormalizedRgb(state.patternBackgroundColor ?? "#000000", "#000000");
      const spacing = Math.max(8, typeof state.patternSpacing === "number" ? state.patternSpacing : 24);
      const opacity = typeof state.opacity === "number" ? state.opacity / 100 : 1.0;
      const bgOpacity = typeof state.patternBackgroundOpacity === "number" ? state.patternBackgroundOpacity / 100 : 1.0;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_color", { type: "3f", value: color });
      setUniform(gl, program, "u_bgColor", { type: "3f", value: bgColor });
      setUniform(gl, program, "u_patternSpacing", { type: "1f", value: spacing });
      setUniform(gl, program, "u_opacity", { type: "1f", value: opacity });
      setUniform(gl, program, "u_bgOpacity", { type: "1f", value: bgOpacity });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  grid: {
    type: "grid",
    vertexShader: BACKGROUND_GRID_VERTEX_SHADER,
    fragmentShader: BACKGROUND_GRID_FRAGMENT_SHADER,
    bindUniforms: (gl, program, state, width, height, time = 0) => {
      const color = hexToNormalizedRgb(state.color, "#3b82f6");
      const bgColor = hexToNormalizedRgb(state.patternBackgroundColor ?? "#000000", "#000000");
      const spacing = Math.max(8, typeof state.patternSpacing === "number" ? state.patternSpacing : 24);
      const opacity = typeof state.opacity === "number" ? state.opacity / 100 : 1.0;
      const bgOpacity = typeof state.patternBackgroundOpacity === "number" ? state.patternBackgroundOpacity / 100 : 1.0;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_color", { type: "3f", value: color });
      setUniform(gl, program, "u_bgColor", { type: "3f", value: bgColor });
      setUniform(gl, program, "u_patternSpacing", { type: "1f", value: spacing });
      setUniform(gl, program, "u_opacity", { type: "1f", value: opacity });
      setUniform(gl, program, "u_bgOpacity", { type: "1f", value: bgOpacity });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
};

/**
 * Checks whether a given BackgroundType is supported on the GPU.
 */
export function isGPUSupportedBackground(type: string): type is BackgroundType {
  return type in GPU_BACKGROUND_REGISTRY;
}

/**
 * Dedicated WebGL2 Procedural Background Renderer and Compositor.
 */
export class GPUBackgroundRenderer {
  private gl: WebGL2RenderingContext;
  private isOwnedContext: boolean = false;
  private resourceManager: WebGLResourceManager;
  private programCache = new Map<BackgroundType | "composite", CompiledProgram>();
  private quad: FullscreenQuad;
  private backgroundFbo: { framebuffer: WebGLFramebuffer; texture: WebGLTexture; width: number; height: number } | null = null;

  constructor(glOrCanvas?: WebGL2RenderingContext | HTMLCanvasElement) {
    if (!glOrCanvas) {
      if (typeof document === "undefined") {
        throw new Error("Cannot create offscreen canvas outside DOM environment");
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
      if (!ctx) throw new Error("Failed to initialize WebGL2 context for background renderer");
      this.gl = ctx;
      this.isOwnedContext = true;
    } else if (typeof (glOrCanvas as HTMLCanvasElement).getContext === "function" && !("createProgram" in (glOrCanvas as object))) {
      const ctx = (glOrCanvas as HTMLCanvasElement).getContext("webgl2", { alpha: true, premultipliedAlpha: false });
      if (!ctx) throw new Error("Failed to initialize WebGL2 context from canvas for background renderer");
      this.gl = ctx as WebGL2RenderingContext;
      this.isOwnedContext = true;
    } else {
      this.gl = glOrCanvas as WebGL2RenderingContext;
      this.isOwnedContext = false;
    }
    this.resourceManager = new WebGLResourceManager(this.gl);
    this.quad = createFullscreenQuad(this.gl);
  }

  public getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  private getProgram(type: BackgroundType | "composite"): CompiledProgram {
    let program = this.programCache.get(type);
    if (!program) {
      if (type === "composite") {
        program = this.resourceManager.registerProgram(
          createProgram(this.gl, BACKGROUND_COMPOSITE_VERTEX_SHADER, BACKGROUND_COMPOSITE_FRAGMENT_SHADER),
        );
      } else {
        const def = GPU_BACKGROUND_REGISTRY[type];
        if (!def) {
          throw new Error(`Unregistered GPU background type: ${type}`);
        }
        program = this.resourceManager.registerProgram(
          createProgram(this.gl, def.vertexShader, def.fragmentShader),
        );
      }
      this.programCache.set(type, program);
    }
    return program;
  }

  private ensureBackgroundFbo(width: number, height: number): { framebuffer: WebGLFramebuffer; texture: WebGLTexture; width: number; height: number } {
    const gl = this.gl;
    if (this.backgroundFbo && this.backgroundFbo.width === width && this.backgroundFbo.height === height) {
      return this.backgroundFbo;
    }

    // Clean up old FBO if size changed
    if (this.backgroundFbo) {
      gl.deleteFramebuffer(this.backgroundFbo.framebuffer);
      gl.deleteTexture(this.backgroundFbo.texture);
      this.backgroundFbo = null;
    }

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create background texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error("Failed to create background framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Background framebuffer incomplete: status ${status}`);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.backgroundFbo = { framebuffer, texture, width, height };
    return this.backgroundFbo;
  }

  /**
   * Renders the specified procedural background to an offscreen FBO texture.
   * Deterministically binds `time` uniform.
   */
  public renderBackgroundToTexture(
    width: number,
    height: number,
    state: BackgroundState,
    time = 0,
  ): WebGLTexture {
    const gl = this.gl;
    const fbo = this.ensureBackgroundFbo(width, height);
    const def = GPU_BACKGROUND_REGISTRY[state.type] || GPU_BACKGROUND_REGISTRY.transparent;
    const program = this.getProgram(state.type);

    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);

    // If transparent, clear with vec4(0)
    if (state.type === "transparent") {
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      gl.useProgram(program.program);
      def.bindUniforms(gl, program, state, width, height, time);
      this.quad.draw();
      gl.useProgram(null);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo.texture;
  }

  /**
   * Renders the specified procedural background directly onto the canvas default framebuffer.
   * Returns the updated HTMLCanvasElement.
   */
  public renderBackgroundToCanvas(
    width: number,
    height: number,
    state: BackgroundState,
    time = 0,
  ): HTMLCanvasElement {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const def = GPU_BACKGROUND_REGISTRY[state.type] || GPU_BACKGROUND_REGISTRY.transparent;
    const program = this.getProgram(state.type);

    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (state.type === "transparent") {
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      gl.useProgram(program.program);
      def.bindUniforms(gl, program, state, width, height, time);
      this.quad.draw();
      gl.useProgram(null);
    }

    return canvas;
  }

  /**
   * Composites the generated background behind a foreground texture and writes to the target framebuffer.
   * If targetFbo is null, renders to the canvas default framebuffer.
   */
  public composite(
    backgroundTexture: WebGLTexture,
    foregroundTexture: WebGLTexture,
    imageWidth: number,
    imageHeight: number,
    backgroundState: BackgroundState,
    targetFbo: WebGLFramebuffer | null = null,
    time = 0,
  ): void {
    const gl = this.gl;
    const padding = backgroundState.padding ?? 0;
    const borderRadius = backgroundState.borderRadius ?? 0;
    const shadowBlur = backgroundState.shadowBlur ?? 16;
    const shadowOpacity = backgroundState.shadowOpacity ?? 0.4;

    const outWidth = imageWidth + 2 * padding;
    const outHeight = imageHeight + 2 * padding;

    gl.viewport(0, 0, outWidth, outHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo);

    const program = this.getProgram("composite");
    gl.useProgram(program.program);

    // Bind background texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    setUniform(gl, program, "u_backgroundTexture", { type: "1i", value: 0 });

    // Bind foreground texture to unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, foregroundTexture);
    setUniform(gl, program, "u_foregroundTexture", { type: "1i", value: 1 });

    // Set uniform geometry & framing parameters
    setUniform(gl, program, "u_resolution", { type: "2f", value: [outWidth, outHeight] });
    setUniform(gl, program, "u_imageSize", { type: "2f", value: [imageWidth, imageHeight] });
    setUniform(gl, program, "u_padding", { type: "1f", value: padding });
    setUniform(gl, program, "u_borderRadius", { type: "1f", value: borderRadius });
    setUniform(gl, program, "u_shadowBlur", { type: "1f", value: shadowBlur });
    setUniform(gl, program, "u_shadowOpacity", { type: "1f", value: shadowOpacity });
    setUniform(gl, program, "u_time", { type: "1f", value: time });

    this.quad.draw();

    // Clean up texture bindings
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  /**
   * Disposes of all allocated GPU resources.
   */
  public dispose(): void {
    const gl = this.gl;
    if (this.backgroundFbo) {
      gl.deleteFramebuffer(this.backgroundFbo.framebuffer);
      gl.deleteTexture(this.backgroundFbo.texture);
      this.backgroundFbo = null;
    }
    this.resourceManager.disposeAll();
    this.quad.dispose();
    this.programCache.clear();
  }
}
