import type { EffectInstance, EffectStack } from "../../types/asset";
import type { BackgroundState } from "../../types/look";
import type { CompiledProgram, FBOTextureAttachment } from "./webgl-types";
import { createProgram, setUniform } from "./webgl-shader";
import { createFullscreenQuad, type FullscreenQuad } from "./webgl-quad";
import { PingPongManager } from "./webgl-fbo";
import { WebGLResourceManager } from "./webgl-resources";
import { uploadTexture, disposeTexture, type GPUTextureRecord, type TextureSource } from "./webgl-texture";
import { parseHexColor } from "../../effects/canvas-utils";
import { resolveEffectParameters } from "../../effects/engine";
import { GPUBackgroundRenderer } from "./webgl-background";

import { PASS_THROUGH_VERTEX_SHADER, PASS_THROUGH_FRAGMENT_SHADER } from "./shaders/pass-through";
import {
  BLACK_AND_WHITE_VERTEX_SHADER,
  BLACK_AND_WHITE_FRAGMENT_SHADER,
} from "./shaders/black-and-white";
import { DUOTONE_VERTEX_SHADER, DUOTONE_FRAGMENT_SHADER } from "./shaders/duotone";
import { POSTERIZE_VERTEX_SHADER, POSTERIZE_FRAGMENT_SHADER } from "./shaders/posterize";
import { GRAIN_VERTEX_SHADER, GRAIN_FRAGMENT_SHADER } from "./shaders/grain";
import { HALFTONE_VERTEX_SHADER, HALFTONE_FRAGMENT_SHADER } from "./shaders/halftone";
import { SCREEN_PRINT_VERTEX_SHADER, SCREEN_PRINT_FRAGMENT_SHADER } from "./shaders/screen-print";
import { VINTAGE_FILM_VERTEX_SHADER, VINTAGE_FILM_FRAGMENT_SHADER } from "./shaders/vintage-film";
import { GLITCH_VERTEX_SHADER, GLITCH_FRAGMENT_SHADER } from "./shaders/glitch";
import { PIXELATE_VERTEX_SHADER, PIXELATE_FRAGMENT_SHADER } from "./shaders/pixelate";
import { LINE_ART_VERTEX_SHADER, LINE_ART_FRAGMENT_SHADER } from "./shaders/line-art";
import { ASCII_VERTEX_SHADER, ASCII_FRAGMENT_SHADER } from "./shaders/ascii";

export type GPUEffectId =
  | "original"
  | "black-and-white"
  | "duotone"
  | "posterize"
  | "grain"
  | "halftone"
  | "screen-print"
  | "vintage-film"
  | "glitch"
  | "pixelate"
  | "line-art"
  | "ascii";

export interface GPUEffectShaderDef {
  id: GPUEffectId;
  vertexShader: string;
  fragmentShader: string;
  bindUniforms: (
    gl: WebGL2RenderingContext,
    program: CompiledProgram,
    params: Record<string, unknown> | undefined,
    width: number,
    height: number,
    time?: number,
  ) => void;
}

function hexToNormalizedRgb(hex: unknown, fallback: string): [number, number, number] {
  const parsed = parseHexColor(hex, fallback);
  return [parsed.r / 255, parsed.g / 255, parsed.b / 255];
}

export const GPU_EFFECT_REGISTRY: Record<GPUEffectId, GPUEffectShaderDef> = {
  original: {
    id: "original",
    vertexShader: PASS_THROUGH_VERTEX_SHADER,
    fragmentShader: PASS_THROUGH_FRAGMENT_SHADER,
    bindUniforms: (gl, program, _params, width, height, time = 0) => {
      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "black-and-white": {
    id: "black-and-white",
    vertexShader: BLACK_AND_WHITE_VERTEX_SHADER,
    fragmentShader: BLACK_AND_WHITE_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, _width, _height, time = 0) => {
      const contrast = typeof params?.contrast === "number" ? params.contrast : 1.2;
      const warmth = typeof params?.warmth === "number" ? params.warmth : 0;
      setUniform(gl, program, "u_contrast", { type: "1f", value: contrast });
      setUniform(gl, program, "u_warmth", { type: "1f", value: warmth });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  duotone: {
    id: "duotone",
    vertexShader: DUOTONE_VERTEX_SHADER,
    fragmentShader: DUOTONE_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, _width, _height, time = 0) => {
      const contrast = typeof params?.contrast === "number" ? params.contrast : 1.0;
      const shadow = hexToNormalizedRgb(params?.shadowColor, "#0f172a");
      const highlight = hexToNormalizedRgb(params?.highlightColor, "#38bdf8");

      setUniform(gl, program, "u_contrast", { type: "1f", value: contrast });
      setUniform(gl, program, "u_shadowColor", { type: "3f", value: shadow });
      setUniform(gl, program, "u_highlightColor", { type: "3f", value: highlight });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  posterize: {
    id: "posterize",
    vertexShader: POSTERIZE_VERTEX_SHADER,
    fragmentShader: POSTERIZE_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, _width, _height, time = 0) => {
      const levels = typeof params?.levels === "number" ? params.levels : 4;
      setUniform(gl, program, "u_levels", { type: "1f", value: levels });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  grain: {
    id: "grain",
    vertexShader: GRAIN_VERTEX_SHADER,
    fragmentShader: GRAIN_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const intensity = typeof params?.intensity === "number" ? params.intensity : 35;
      setUniform(gl, program, "u_intensity", { type: "1f", value: intensity });
      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  halftone: {
    id: "halftone",
    vertexShader: HALFTONE_VERTEX_SHADER,
    fragmentShader: HALFTONE_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const dotSize = typeof params?.dotSize === "number" ? params.dotSize : 6;
      const contrast = typeof params?.contrast === "number" ? params.contrast : 1.3;
      const angle = typeof params?.angle === "number" ? params.angle : 45;
      const density = typeof params?.density === "number" ? params.density : 1.0;
      const brightness = typeof params?.brightness === "number" ? params.brightness : 0;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_dotSize", { type: "1f", value: dotSize });
      setUniform(gl, program, "u_contrast", { type: "1f", value: contrast });
      setUniform(gl, program, "u_angle", { type: "1f", value: angle });
      setUniform(gl, program, "u_density", { type: "1f", value: density });
      setUniform(gl, program, "u_brightness", { type: "1f", value: brightness });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "screen-print": {
    id: "screen-print",
    vertexShader: SCREEN_PRINT_VERTEX_SHADER,
    fragmentShader: SCREEN_PRINT_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const inkColor1 = hexToNormalizedRgb(params?.inkColor1, "#e11d48");
      const inkColor2 = hexToNormalizedRgb(params?.inkColor2, "#0284c7");
      const inkDensity = typeof params?.inkDensity === "number" ? params.inkDensity : 1.0;
      const halftoneSize = typeof params?.halftoneSize === "number" ? params.halftoneSize : 8;
      const grain = typeof params?.grain === "number" ? params.grain : 20;
      const contrast = typeof params?.contrast === "number" ? params.contrast : 1.4;
      const registrationOffset = typeof params?.registrationOffset === "number" ? params.registrationOffset : 3;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_inkColor1", { type: "3f", value: inkColor1 });
      setUniform(gl, program, "u_inkColor2", { type: "3f", value: inkColor2 });
      setUniform(gl, program, "u_inkDensity", { type: "1f", value: inkDensity });
      setUniform(gl, program, "u_halftoneSize", { type: "1f", value: halftoneSize });
      setUniform(gl, program, "u_grain", { type: "1f", value: grain });
      setUniform(gl, program, "u_contrast", { type: "1f", value: contrast });
      setUniform(gl, program, "u_registrationOffset", { type: "1f", value: registrationOffset });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "vintage-film": {
    id: "vintage-film",
    vertexShader: VINTAGE_FILM_VERTEX_SHADER,
    fragmentShader: VINTAGE_FILM_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const grain = typeof params?.grain === "number" ? params.grain : 30;
      const fade = typeof params?.fade === "number" ? params.fade : 25;
      const contrast = typeof params?.contrast === "number" ? params.contrast : 1.1;
      const saturation = typeof params?.saturation === "number" ? params.saturation : 0.8;
      const vignette = typeof params?.vignette === "number" ? params.vignette : 40;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_grain", { type: "1f", value: grain });
      setUniform(gl, program, "u_fade", { type: "1f", value: fade });
      setUniform(gl, program, "u_contrast", { type: "1f", value: contrast });
      setUniform(gl, program, "u_saturation", { type: "1f", value: saturation });
      setUniform(gl, program, "u_vignette", { type: "1f", value: vignette });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  glitch: {
    id: "glitch",
    vertexShader: GLITCH_VERTEX_SHADER,
    fragmentShader: GLITCH_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const intensity = typeof params?.intensity === "number" ? params.intensity : 40;
      const rgbShift = typeof params?.rgbShift === "number" ? params.rgbShift : 8;
      const noise = typeof params?.noise === "number" ? params.noise : 20;
      const scanlines = typeof params?.scanlines === "number" ? params.scanlines : 30;
      const distortion = typeof params?.distortion === "number" ? params.distortion : 15;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_intensity", { type: "1f", value: intensity });
      setUniform(gl, program, "u_rgbShift", { type: "1f", value: rgbShift });
      setUniform(gl, program, "u_noise", { type: "1f", value: noise });
      setUniform(gl, program, "u_scanlines", { type: "1f", value: scanlines });
      setUniform(gl, program, "u_distortion", { type: "1f", value: distortion });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  pixelate: {
    id: "pixelate",
    vertexShader: PIXELATE_VERTEX_SHADER,
    fragmentShader: PIXELATE_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const blockSize = typeof params?.blockSize === "number" ? params.blockSize : 12;
      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_blockSize", { type: "1f", value: blockSize });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  "line-art": {
    id: "line-art",
    vertexShader: LINE_ART_VERTEX_SHADER,
    fragmentShader: LINE_ART_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const edgeThreshold = typeof params?.edgeThreshold === "number" ? params.edgeThreshold : 45;
      const lineWeight = typeof params?.lineWeight === "number" ? params.lineWeight : 1.5;
      const invert = Boolean(params?.invert) ? 1.0 : 0.0;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_edgeThreshold", { type: "1f", value: edgeThreshold });
      setUniform(gl, program, "u_lineWeight", { type: "1f", value: lineWeight });
      setUniform(gl, program, "u_invert", { type: "1f", value: invert });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
  ascii: {
    id: "ascii",
    vertexShader: ASCII_VERTEX_SHADER,
    fragmentShader: ASCII_FRAGMENT_SHADER,
    bindUniforms: (gl, program, params, width, height, time = 0) => {
      const fontSize = typeof params?.fontSize === "number" ? params.fontSize : 10;
      const densityStr = String(params?.characterDensity ?? "standard");
      const colorModeStr = String(params?.colorMode ?? "monochrome");

      let densityVal = 0.0;
      if (densityStr === "blocks") densityVal = 1.0;
      else if (densityStr === "minimal") densityVal = 2.0;

      let colorModeVal = 0.0;
      if (colorModeStr === "color") colorModeVal = 1.0;
      else if (colorModeStr === "greenPhosphor") colorModeVal = 2.0;
      else if (colorModeStr === "amberCRT") colorModeVal = 3.0;

      setUniform(gl, program, "u_resolution", { type: "2f", value: [width, height] });
      setUniform(gl, program, "u_fontSize", { type: "1f", value: fontSize });
      setUniform(gl, program, "u_characterDensity", { type: "1f", value: densityVal });
      setUniform(gl, program, "u_colorMode", { type: "1f", value: colorModeVal });
      setUniform(gl, program, "u_time", { type: "1f", value: time });
    },
  },
};

/**
 * Checks whether an effect ID has a native GPU WebGL2 shader implementation.
 */
export function isGPUSupportedEffect(id: string): id is GPUEffectId {
  return id in GPU_EFFECT_REGISTRY;
}

/**
 * Checks whether an entire EffectStack (EffectInstance[]) can be executed 100% on the GPU.
 */
export function canExecuteStackOnGPU(stack: EffectStack | null | undefined): boolean {
  if (!stack || stack.length === 0) return true;
  return stack.every((item) => !item.enabled || isGPUSupportedEffect(item.effectId));
}

/**
 * GPU Multi-Pass Effect Execution Pipeline using Ping-Pong Framebuffers.
 */
export class GPUEffectPipeline {
  private gl: WebGL2RenderingContext;
  private resourceManager: WebGLResourceManager;
  private programCache = new Map<GPUEffectId, CompiledProgram>();
  private quad: FullscreenQuad;
  private pingPong: PingPongManager | null = null;
  private sourceTextureRecord: GPUTextureRecord | null = null;
  private backgroundRenderer: GPUBackgroundRenderer | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.resourceManager = new WebGLResourceManager(gl);
    this.quad = createFullscreenQuad(gl);
  }

  public getBackgroundRenderer(): GPUBackgroundRenderer {
    if (!this.backgroundRenderer) {
      this.backgroundRenderer = new GPUBackgroundRenderer(this.gl);
    }
    return this.backgroundRenderer;
  }

  private getProgram(effectId: GPUEffectId): CompiledProgram {
    let program = this.programCache.get(effectId);
    if (!program) {
      const def = GPU_EFFECT_REGISTRY[effectId];
      if (!def) {
        throw new Error(`Unregistered GPU effect: ${effectId}`);
      }
      program = this.resourceManager.registerProgram(
        createProgram(this.gl, def.vertexShader, def.fragmentShader),
      );
      this.programCache.set(effectId, program);
    }
    return program;
  }

  /**
   * Uploads or updates the source texture on the GPU.
   */
  public uploadSourceTexture(source: TextureSource, sourceId = "active-asset-source"): GPUTextureRecord {
    this.sourceTextureRecord = uploadTexture(
      this.gl,
      source,
      sourceId,
      this.sourceTextureRecord,
    );
    return this.sourceTextureRecord;
  }

  /**
   * Executes a sequential stack of GPU effects using ping-pong framebuffers.
   * Returns the final FBO attachment containing the processed image.
   * Guaranteed multi-pass time consistency: all passes receive the identical `time` timestamp.
   */
  public executeStack(
    sourceTexture: WebGLTexture,
    width: number,
    height: number,
    stack: EffectStack | null | undefined,
    time = 0,
  ): FBOTextureAttachment {
    const gl = this.gl;

    if (!this.pingPong) {
      this.pingPong = new PingPongManager(gl, width, height);
    } else {
      this.pingPong.resize(width, height);
    }

    const activeItems = (stack ?? []).filter((item) => item.enabled !== false);

    // If stack is empty or has no active effects, run a single pass-through pass into the FBO
    if (activeItems.length === 0) {
      this.renderSinglePass(
        "original",
        sourceTexture,
        this.pingPong.write,
        undefined,
        width,
        height,
        time,
      );
      this.pingPong.swap();
      return this.pingPong.read;
    }

    // Sequential Multi-Pass execution
    let currentInputTexture = sourceTexture;

    for (let i = 0; i < activeItems.length; i++) {
      const item = activeItems[i]!;
      const effectId = item.effectId as GPUEffectId;

      if (!isGPUSupportedEffect(effectId)) {
        throw new Error(`Cannot execute unsupported GPU effect ${effectId} on WebGL2 pipeline`);
      }

      const targetFBO = this.pingPong.write;
      const resolvedParams = resolveEffectParameters(effectId, item.parameters);

      this.renderSinglePass(
        effectId,
        currentInputTexture,
        targetFBO,
        resolvedParams,
        width,
        height,
        time,
      );

      this.pingPong.swap();
      currentInputTexture = this.pingPong.read.texture;
    }

    return this.pingPong.read;
  }

  /**
   * Executes the effect stack and renders the final processed result directly onto the WebGL canvas default framebuffer.
   * Returns the updated HTMLCanvasElement ready for composition or display.
   */
  public renderStackToCanvas(
    source: TextureSource,
    width: number,
    height: number,
    stack: EffectStack | null | undefined,
    sourceId = "active-source",
    time = 0,
  ): HTMLCanvasElement {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const texRecord = this.uploadSourceTexture(source, sourceId);
    const activeItems = (stack ?? []).filter((item) => item.enabled !== false);

    // If stack has no active items, draw source directly to canvas
    if (activeItems.length === 0) {
      gl.viewport(0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const program = this.getProgram("original");
      gl.useProgram(program.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texRecord.texture);
      setUniform(gl, program, "u_texture", { type: "1i", value: 0 });
      GPU_EFFECT_REGISTRY["original"].bindUniforms(gl, program, undefined, width, height, time);
      this.quad.draw();
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);
      return canvas;
    }

    // Execute multi-pass ping-pong with consistent frame time
    const finalAttachment = this.executeStack(
      texRecord.texture,
      width,
      height,
      activeItems,
      time,
    );

    // Render final attachment to canvas default framebuffer
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const passProgram = this.getProgram("original");
    gl.useProgram(passProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, finalAttachment.texture);
    setUniform(gl, passProgram, "u_texture", { type: "1i", value: 0 });
    GPU_EFFECT_REGISTRY["original"].bindUniforms(gl, passProgram, undefined, width, height, time);
    this.quad.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);

    return canvas;
  }

  /**
   * Renders the processed effect stack composited with the creative background directly onto the canvas.
   * If background is transparent and padding is 0, renders processed image directly.
   * All passes (foreground effect stack, background generation, composite) receive the exact same `time`.
   */
  public renderCompositedStackToCanvas(
    source: TextureSource,
    imageWidth: number,
    imageHeight: number,
    stack: EffectStack | null | undefined,
    backgroundState: BackgroundState,
    sourceId = "active-source",
    time = 0,
  ): HTMLCanvasElement {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const padding = backgroundState.padding ?? 0;

    // If background is transparent and no framing padding, standard renderStackToCanvas
    if (backgroundState.type === "transparent" && padding === 0) {
      return this.renderStackToCanvas(source, imageWidth, imageHeight, stack, sourceId, time);
    }

    const outWidth = imageWidth + 2 * padding;
    const outHeight = imageHeight + 2 * padding;

    if (canvas.width !== outWidth || canvas.height !== outHeight) {
      canvas.width = outWidth;
      canvas.height = outHeight;
    }

    // 1. Process foreground image through effect stack into FBO
    const texRecord = this.uploadSourceTexture(source, sourceId);
    const activeItems = (stack ?? []).filter((item) => item.enabled !== false);
    let foregroundTexture: WebGLTexture;

    if (activeItems.length === 0) {
      foregroundTexture = texRecord.texture;
    } else {
      const finalAttachment = this.executeStack(
        texRecord.texture,
        imageWidth,
        imageHeight,
        activeItems,
        time,
      );
      foregroundTexture = finalAttachment.texture;
    }

    // 2. Render procedural background texture with identical time
    const bgRenderer = this.getBackgroundRenderer();
    const bgTexture = bgRenderer.renderBackgroundToTexture(
      outWidth,
      outHeight,
      backgroundState,
      time,
    );

    // 3. Composite background + shadow + foreground into canvas default framebuffer
    bgRenderer.composite(
      bgTexture,
      foregroundTexture,
      imageWidth,
      imageHeight,
      backgroundState,
      null,
      time,
    );

    return canvas;
  }

  private renderSinglePass(
    effectId: GPUEffectId,
    inputTexture: WebGLTexture,
    destinationFBO: FBOTextureAttachment,
    params: Record<string, unknown> | undefined,
    width: number,
    height: number,
    time = 0,
  ): void {
    const gl = this.gl;
    const program = this.getProgram(effectId);
    const def = GPU_EFFECT_REGISTRY[effectId];

    gl.viewport(0, 0, destinationFBO.width, destinationFBO.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, destinationFBO.framebuffer);

    gl.useProgram(program.program);

    // Bind input texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    setUniform(gl, program, "u_texture", { type: "1i", value: 0 });

    // Bind effect uniforms with resolved parameters and timeline time
    const resolvedParams = resolveEffectParameters(effectId, params);
    def.bindUniforms(gl, program, resolvedParams, width, height, time);

    // Draw full-screen quad
    this.quad.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  public dispose(): void {
    if (this.backgroundRenderer) {
      this.backgroundRenderer.dispose();
      this.backgroundRenderer = null;
    }
    if (this.sourceTextureRecord) {
      disposeTexture(this.gl, this.sourceTextureRecord);
      this.sourceTextureRecord = null;
    }
    if (this.pingPong) {
      this.pingPong.dispose();
      this.pingPong = null;
    }
    this.quad.dispose();
    this.programCache.clear();
    this.resourceManager.disposeAll();
  }
}
