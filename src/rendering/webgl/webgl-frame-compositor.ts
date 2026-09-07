import type { Frame, Layer, GenerativeLayer, ImageLayer, BlendMode } from "../../types/frame";
import { DEFAULT_LAYER_TRANSFORM } from "../../types/frame";
import type { EffectInstance, EffectStack } from "../../types/asset";
import { DEFAULT_BACKGROUND_STATE, type BackgroundState } from "../../types/look";
import {
  normalizeGenerativeLayer,
  deriveLegacyBackgroundFromSublayers,
} from "../../generative/normalization";
import type { CompiledProgram, FBOTextureAttachment } from "./webgl-types";
import { createWebGL2Context } from "./webgl-context";
import { createProgram, setUniform } from "./webgl-shader";
import { createFullscreenQuad, type FullscreenQuad } from "./webgl-quad";
import { PingPongManager, createFBOAttachment, deleteFBOAttachment } from "./webgl-fbo";
import { WebGLResourceManager } from "./webgl-resources";
import { uploadTexture, disposeTexture, type GPUTextureRecord, type TextureSource } from "./webgl-texture";
import { GPUBackgroundRenderer, isGPUSupportedBackground } from "./webgl-background";
import {
  GPUEffectPipeline,
  canExecuteStackOnGPU,
  GPU_EFFECT_REGISTRY,
  type GPUEffectId,
} from "./webgl-effect-pipeline";
import { resolveEffectParameters } from "../../effects/engine";
import {
  LAYER_BLEND_VERTEX_SHADER,
  LAYER_BLEND_FRAGMENT_SHADER,
} from "./shaders/layer-blend";
import {
  LAYER_IMAGE_VERTEX_SHADER,
  LAYER_IMAGE_FRAGMENT_SHADER,
} from "./shaders/layer-image";
import {
  VIEWPORT_PASS_THROUGH_VERTEX_SHADER,
  VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER,
} from "./shaders/viewport-pass-through";
import {
  PASS_THROUGH_VERTEX_SHADER,
  PASS_THROUGH_FRAGMENT_SHADER,
} from "./shaders/pass-through";

/**
 * Numeric mapping for the 12 approved W3C blend modes.
 */
export const BLEND_MODE_MAP: Record<BlendMode, number> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  darken: 4,
  lighten: 5,
  "color-dodge": 6,
  "color-burn": 7,
  "hard-light": 8,
  "soft-light": 9,
  difference: 10,
  exclusion: 11,
};

export interface ViewportPresentationParams {
  viewportWidth: number;
  viewportHeight: number;
  panX: number;
  panY: number;
  zoom: number; // percentage (e.g. 100 = 1.0)
  splitPosition?: number; // 0.0 to 1.0, or -1.0 if disabled
  clearColor?: [number, number, number, number];
}

/**
 * Stage 1B Multi-Layer WebGL2 Frame Compositor.
 *
 * Implements the approved decoupled 4-FBO reusable working set:
 * - Accumulator Pair (2 FBOs): Accumulator A <-> Accumulator B (cross-layer accumulation)
 * - Layer Ping-Pong Pair (2 FBOs): Layer Ping <-> Layer Pong (intra-layer source & effect passes)
 *
 * Guaranteed invariants:
 * 1. Bounded working-set memory (~33.2 MB at 1080p, ~132.7 MB at 4K) independent of layer count.
 * 2. Zero WebGL feedback loops: source textures and destination framebuffers are always distinct.
 * 3. Bottom-to-top layer evaluation (GenerativeLayer backdrop at index 0, followed by ImageLayers).
 * 4. 12 W3C blend modes with mathematically sound premultiplied alpha compositing.
 * 5. Viewport pan/zoom presentation is completely decoupled from composition invalidation.
 */
export class WebGL2FrameCompositor {
  private gl: WebGL2RenderingContext;
  private isOwnedContext = false;
  private resourceManager: WebGLResourceManager;
  private quad: FullscreenQuad;

  // Reusable 4-FBO Working Set
  private accumulatorPair: PingPongManager | null = null;
  private layerPingPong: PingPongManager | null = null;
  private workingWidth = 0;
  private workingHeight = 0;

  // Shader programs
  private blendProgram: CompiledProgram;
  private imageProgram: CompiledProgram;
  private viewportProgram: CompiledProgram;
  private passThroughProgram: CompiledProgram;
  private effectPrograms = new Map<GPUEffectId, CompiledProgram>();

  // Sub-renderers
  private backgroundRenderer: GPUBackgroundRenderer;

  // Asset GPU texture cache
  private assetTextureCache = new Map<string, GPUTextureRecord>();

  // Composition caching for zero re-compositing on camera pan/zoom
  private lastCompositionKey = "";
  private isComposited = false;

  constructor(glOrCanvas: WebGL2RenderingContext | HTMLCanvasElement) {
    if (
      typeof (glOrCanvas as HTMLCanvasElement).getContext === "function" &&
      !("createProgram" in (glOrCanvas as object))
    ) {
      const canvas = glOrCanvas as HTMLCanvasElement;
      const ctx = createWebGL2Context(canvas, {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      if (!ctx) {
        throw new Error("Failed to initialize WebGL2 context on canvas for Frame Compositor");
      }
      this.gl = ctx;
      this.isOwnedContext = true;
    } else {
      this.gl = glOrCanvas as WebGL2RenderingContext;
      this.isOwnedContext = false;
    }

    const gl = this.gl;
    this.resourceManager = new WebGLResourceManager(gl);
    this.quad = createFullscreenQuad(gl);

    // Compile core shader programs
    this.blendProgram = this.resourceManager.registerProgram(
      createProgram(gl, LAYER_BLEND_VERTEX_SHADER, LAYER_BLEND_FRAGMENT_SHADER),
    );
    this.imageProgram = this.resourceManager.registerProgram(
      createProgram(gl, LAYER_IMAGE_VERTEX_SHADER, LAYER_IMAGE_FRAGMENT_SHADER),
    );
    this.viewportProgram = this.resourceManager.registerProgram(
      createProgram(gl, VIEWPORT_PASS_THROUGH_VERTEX_SHADER, VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER),
    );
    this.passThroughProgram = this.resourceManager.registerProgram(
      createProgram(gl, PASS_THROUGH_VERTEX_SHADER, PASS_THROUGH_FRAGMENT_SHADER),
    );

    // Initialize sub-renderer sharing context
    this.backgroundRenderer = new GPUBackgroundRenderer(gl);
  }

  public getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  /**
   * Resizes or initializes the 4-FBO reusable working pool to match the Frame's native dimensions.
   */
  public resizeWorkingPool(width: number, height: number): void {
    const clampedW = Math.max(1, Math.round(width));
    const clampedH = Math.max(1, Math.round(height));

    if (this.workingWidth === clampedW && this.workingHeight === clampedH && this.accumulatorPair && this.layerPingPong) {
      return;
    }

    this.workingWidth = clampedW;
    this.workingHeight = clampedH;

    if (!this.accumulatorPair) {
      this.accumulatorPair = new PingPongManager(this.gl, clampedW, clampedH);
    } else {
      this.accumulatorPair.resize(clampedW, clampedH);
    }

    if (!this.layerPingPong) {
      this.layerPingPong = new PingPongManager(this.gl, clampedW, clampedH);
    } else {
      this.layerPingPong.resize(clampedW, clampedH);
    }

    // Dimension changes invalidate any cached composition
    this.isComposited = false;
  }

  /**
   * Uploads or updates an asset's GPU texture record in the compositor cache.
   */
  public uploadAsset(assetId: string, source: TextureSource): GPUTextureRecord {
    const existing = this.assetTextureCache.get(assetId);
    const updated = uploadTexture(this.gl, source, assetId, existing);
    this.assetTextureCache.set(assetId, updated);
    return updated;
  }

  /**
   * Retrieves an asset GPU texture record from cache.
   */
  public getAssetTexture(assetId: string): GPUTextureRecord | undefined {
    return this.assetTextureCache.get(assetId);
  }

  /**
   * Invalidates the composition cache, forcing the next `composeFrame` call to re-render.
   */
  public invalidate(): void {
    this.isComposited = false;
    this.lastCompositionKey = "";
  }

  /**
   * Returns a cache key representing all composition-affecting state in a Frame.
   */
  private generateCompositionKey(
    frame: Frame,
    assetSources?: Map<string, TextureSource>,
    time = 0,
  ): string {
    const parts: string[] = [
      frame.id,
      `${frame.dimensions.width}x${frame.dimensions.height}`,
      `t:${time}`,
    ];

    for (let i = 0; i < frame.layers.length; i++) {
      const layer = frame.layers[i]!;
      parts.push(
        `l[${i}]:${layer.id}:${layer.type}:${layer.visible}:${layer.opacity}:${layer.blendMode}`,
      );

      if (layer.type === "generative") {
        const normalized = normalizeGenerativeLayer(layer);
        const backgrounds = normalized.backgrounds ?? normalized.sublayers ?? [];
        parts.push(`gen:${backgrounds.length}`);
        for (let s = 0; s < backgrounds.length; s++) {
          const bg = backgrounds[s]!;
          parts.push(
            `bg[${s}]:${bg.id}:${bg.type}:${bg.enabled}:${bg.opacity}:${bg.blendMode}:${bg.seed ?? ""}:${JSON.stringify(bg.parameters ?? {})}`,
          );
        }
      } else if (layer.type === "image") {
        const t = layer.transform ?? DEFAULT_LAYER_TRANSFORM;
        parts.push(`img:${layer.assetId}:${layer.fit}:${t.x}:${t.y}:${t.scaleX}:${t.scaleY}:${t.rotation}`);
        const stack = layer.effectStack ?? [];
        for (const eff of stack) {
          if (eff.enabled !== false) {
            parts.push(`eff:${eff.effectId}:${JSON.stringify(eff.parameters ?? {})}`);
          }
        }
      }
    }

    return parts.join("|");
  }

  /**
   * Executes the full multi-layer compositing pipeline for a Frame.
   * Consumes `frame.layers` strictly bottom-to-top.
   * Returns the final `FBOTextureAttachment` containing the complete composited artwork.
   */
  public composeFrame(
    frame: Frame,
    assetSources?: Map<string, TextureSource>,
    time = 0,
    force = false,
  ): FBOTextureAttachment {
    const width = frame.dimensions.width;
    const height = frame.dimensions.height;

    this.resizeWorkingPool(width, height);

    const compositionKey = this.generateCompositionKey(frame, assetSources, time);
    if (!force && this.isComposited && this.lastCompositionKey === compositionKey && this.accumulatorPair) {
      return this.accumulatorPair.read;
    }

    const gl = this.gl;
    const accum = this.accumulatorPair!;
    const layerPP = this.layerPingPong!;

    // 1. Initialize Accumulator A: clear to transparent black
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, accum.read.framebuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 2. Iterate layers strictly in bottom-to-top order (index 0..N-1)
    const layers = frame.layers;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;

      // Skip invisible or zero-opacity layers
      if (layer.visible === false || layer.opacity <= 0) {
        continue;
      }

      let layerOutputTexture: WebGLTexture | null = null;

      if (layer.type === "generative") {
        // --- GenerativeLayer (index 0 backdrop) ---
        layerOutputTexture = this.renderGenerativeLayer(layer, width, height, time);
      } else if (layer.type === "image") {
        // --- ImageLayer ---
        layerOutputTexture = this.renderImageLayer(layer, width, height, assetSources, time);
      }

      if (!layerOutputTexture) {
        continue;
      }

      // 3. Cross-layer compositing pass:
      // Composite layerOutputTexture over accumulatorPair.read into accumulatorPair.write
      gl.viewport(0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, accum.write.framebuffer);

      gl.useProgram(this.blendProgram.program);

      // Texture Unit 0: Backdrop (Accumulator Read)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, accum.read.texture);
      setUniform(gl, this.blendProgram, "u_backdrop", { type: "1i", value: 0 });

      // Texture Unit 1: Source (Layer Output)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, layerOutputTexture);
      setUniform(gl, this.blendProgram, "u_source", { type: "1i", value: 1 });

      // Layer blending parameters
      const blendModeInt = BLEND_MODE_MAP[layer.blendMode] ?? 0;
      setUniform(gl, this.blendProgram, "u_blendMode", { type: "1i", value: blendModeInt });
      setUniform(gl, this.blendProgram, "u_opacity", {
        type: "1f",
        value: Math.max(0.0, Math.min(1.0, layer.opacity)),
      });

      this.quad.draw();

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);

      // Swap accumulator targets: what was just written becomes the new backdrop
      accum.swap();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.lastCompositionKey = compositionKey;
    this.isComposited = true;

    return accum.read;
  }

  /**
   * Stage 3B: Renders a GenerativeLayer composite into `layerPingPong` and returns the resulting texture.
   * Consumes normalized sublayers sequentially, accumulating them through layerPingPong
   * using the reusable procedural scratch FBO (backgroundFbo) as the primitive target.
   *
   * Working set invariant:
   * - Exactly 5 FBOs total in the compositor: accumulatorPair (2), layerPingPong (2), backgroundFbo (1).
   * - Zero new FBO allocations per sublayer.
   * - Zero WebGL feedback loops: backgroundFbo (source) and layerPingPong.read (backdrop)
   *   are always distinct from layerPingPong.write (render target).
   * - Empty sublayer stack (or all disabled) yields clean transparent black vec4(0.0).
   */
  private renderGenerativeLayer(
    layer: GenerativeLayer,
    width: number,
    height: number,
    time = 0,
  ): WebGLTexture {
    const gl = this.gl;
    const layerPP = this.layerPingPong!;

    // 1. Always start with layerPingPong.read cleared to transparent black
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, layerPP.read.framebuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 2. Normalize GenerativeLayer to canonical backgrounds representation
    const normalized = normalizeGenerativeLayer(layer);
    const backgrounds = normalized.backgrounds ?? normalized.sublayers ?? [];
    const activeBackgrounds = backgrounds.filter(
      (bg) => bg.enabled !== false && bg.opacity > 0,
    );

    // 3. Fast path: Empty or entirely disabled stack produces clean transparent output
    if (activeBackgrounds.length === 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return layerPP.read.texture;
    }

    // 4. Sequentially render each enabled background and composite into layerPingPong
    for (let s = 0; s < activeBackgrounds.length; s++) {
      const bg = activeBackgrounds[s]!;

      // Step A: Render the floor primitive into the scratch FBO (backgroundFbo)
      const bgTex = this.backgroundRenderer.renderBackgroundItemToTexture(
        width,
        height,
        bg,
        time,
      );

      // Step B: Composite background over accumulated intra-layer composite in layerPP
      // Target: layerPP.write.framebuffer
      // Backdrop: layerPP.read.texture (Accumulated result of backgrounds 0..s-1)
      // Source: bgTex (backgroundFbo.texture)
      gl.viewport(0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layerPP.write.framebuffer);

      gl.useProgram(this.blendProgram.program);

      // Texture Unit 0: Backdrop (layerPP.read)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layerPP.read.texture);
      setUniform(gl, this.blendProgram, "u_backdrop", { type: "1i", value: 0 });

      // Texture Unit 1: Source (bgTex from scratch FBO)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      setUniform(gl, this.blendProgram, "u_source", { type: "1i", value: 1 });

      // Background item blending and opacity
      const blendModeInt = BLEND_MODE_MAP[bg.blendMode] ?? 0;
      setUniform(gl, this.blendProgram, "u_blendMode", { type: "1i", value: blendModeInt });
      setUniform(gl, this.blendProgram, "u_opacity", {
        type: "1f",
        value: Math.max(0.0, Math.min(1.0, bg.opacity)),
      });

      this.quad.draw();

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);

      // Step C: Swap layerPingPong so write becomes the new accumulated read backdrop
      layerPP.swap();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Final accumulated GenerativeLayer result resides in layerPP.read.texture
    return layerPP.read.texture;
  }

  /**
   * Renders an ImageLayer (asset texture fitted to frame + intra-layer effect stack) into `layerPingPong`.
   */
  private renderImageLayer(
    layer: ImageLayer,
    frameWidth: number,
    frameHeight: number,
    assetSources?: Map<string, TextureSource>,
    time = 0,
  ): WebGLTexture | null {
    const gl = this.gl;

    // Resolve asset GPU texture
    let texRecord = this.assetTextureCache.get(layer.assetId);

    if (!texRecord && assetSources?.has(layer.assetId)) {
      const source = assetSources.get(layer.assetId)!;
      texRecord = this.uploadAsset(layer.assetId, source);
    }

    if (!texRecord) {
      // Asset not yet uploaded or available
      return null;
    }

    const layerPP = this.layerPingPong!;

    // Step 1: Draw fitted source image into Layer Ping/Write FBO
    gl.viewport(0, 0, frameWidth, frameHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, layerPP.write.framebuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.imageProgram.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texRecord.texture);
    setUniform(gl, this.imageProgram, "u_assetTexture", { type: "1i", value: 0 });
    setUniform(gl, this.imageProgram, "u_frameSize", { type: "2f", value: [frameWidth, frameHeight] });
    setUniform(gl, this.imageProgram, "u_assetSize", { type: "2f", value: [texRecord.width, texRecord.height] });
    setUniform(gl, this.imageProgram, "u_fitMode", {
      type: "1i",
      value: layer.fit === "cover" ? 1 : 0,
    });

    const transform = layer.transform ?? DEFAULT_LAYER_TRANSFORM;
    setUniform(gl, this.imageProgram, "u_layerOffset", {
      type: "2f",
      value: [transform.x, transform.y],
    });
    setUniform(gl, this.imageProgram, "u_layerScale", {
      type: "2f",
      value: [transform.scaleX, transform.scaleY],
    });
    setUniform(gl, this.imageProgram, "u_layerRotation", {
      type: "1f",
      value: (transform.rotation * Math.PI) / 180.0,
    });

    this.quad.draw();

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    layerPP.swap();

    // Step 2: Intra-layer effect stack execution
    const activeEffects = (layer.effectStack ?? []).filter((eff) => eff.enabled !== false);

    if (activeEffects.length === 0) {
      // No effects to execute; fitted image is ready in layerPP.read
      return layerPP.read.texture;
    }

    // Ping-pong through layerPP applying each active effect
    for (let e = 0; e < activeEffects.length; e++) {
      const eff = activeEffects[e]!;
      const effectId = eff.effectId as GPUEffectId;

      const def = GPU_EFFECT_REGISTRY[effectId];
      if (!def) {
        continue;
      }

      let program = this.effectPrograms.get(effectId);
      if (!program) {
        program = this.resourceManager.registerProgram(
          createProgram(gl, def.vertexShader, def.fragmentShader),
        );
        this.effectPrograms.set(effectId, program);
      }

      gl.viewport(0, 0, frameWidth, frameHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layerPP.write.framebuffer);

      gl.useProgram(program.program);

      // Bind current input texture (from layerPP.read)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layerPP.read.texture);
      setUniform(gl, program, "u_texture", { type: "1i", value: 0 });

      // Bind effect uniforms
      const resolvedParams = resolveEffectParameters(effectId, eff.parameters);
      def.bindUniforms(gl, program, resolvedParams, frameWidth, frameHeight, time);

      this.quad.draw();

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      layerPP.swap();
    }

    return layerPP.read.texture;
  }

  /**
   * Final Presentation Pass:
   * Renders the accumulated Frame composite onto the visible canvas applying the viewport camera matrix.
   * Viewport pan and zoom call this method directly without re-compositing any layer.
   */
  public renderPresentation(params: ViewportPresentationParams): boolean {
    if (!this.accumulatorPair) {
      return false;
    }

    const gl = this.gl;
    const {
      viewportWidth,
      viewportHeight,
      panX,
      panY,
      zoom,
      splitPosition = -1.0,
      clearColor = [0.0, 0.0, 0.0, 0.0],
    } = params;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return false;
    }

    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Render directly to canvas default buffer

    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.viewportProgram.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.accumulatorPair.read.texture);
    setUniform(gl, this.viewportProgram, "u_texture", { type: "1i", value: 0 });

    setUniform(gl, this.viewportProgram, "u_viewportSize", {
      type: "2f",
      value: [viewportWidth, viewportHeight],
    });
    setUniform(gl, this.viewportProgram, "u_imageSize", {
      type: "2f",
      value: [this.workingWidth, this.workingHeight],
    });
    setUniform(gl, this.viewportProgram, "u_pan", {
      type: "2f",
      value: [panX, panY],
    });
    setUniform(gl, this.viewportProgram, "u_zoom", {
      type: "1f",
      value: zoom / 100,
    });
    setUniform(gl, this.viewportProgram, "u_splitPosition", {
      type: "1f",
      value: splitPosition,
    });

    this.quad.draw();

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);

    return true;
  }

  /**
   * Renders the accumulated Frame composite 1:1 onto a target canvas (e.g. for export).
   */
  public renderToCanvas(targetCanvas: HTMLCanvasElement): void {
    if (!this.accumulatorPair) {
      return;
    }

    const gl = this.gl;
    if (targetCanvas.width !== this.workingWidth || targetCanvas.height !== this.workingHeight) {
      targetCanvas.width = this.workingWidth;
      targetCanvas.height = this.workingHeight;
    }

    gl.viewport(0, 0, this.workingWidth, this.workingHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(this.passThroughProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.accumulatorPair.read.texture);
    setUniform(gl, this.passThroughProgram, "u_texture", { type: "1i", value: 0 });
    setUniform(gl, this.passThroughProgram, "u_resolution", {
      type: "2f",
      value: [this.workingWidth, this.workingHeight],
    });
    setUniform(gl, this.passThroughProgram, "u_time", { type: "1f", value: 0 });

    this.quad.draw();

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  /**
   * Returns the current accumulated Frame FBO attachment.
   */
  public getCompositeAttachment(): FBOTextureAttachment | null {
    return this.accumulatorPair ? this.accumulatorPair.read : null;
  }

  /**
   * Returns the current accumulated Frame composite texture.
   */
  public getCompositeTexture(): WebGLTexture | null {
    return this.accumulatorPair ? this.accumulatorPair.read.texture : null;
  }

  public getWorkingDimensions(): { width: number; height: number } {
    return { width: this.workingWidth, height: this.workingHeight };
  }

  public getBackgroundRenderer(): GPUBackgroundRenderer {
    return this.backgroundRenderer;
  }

  /**
   * Returns empirical telemetry about compositor FBO allocations.
   * Total FBO count is guaranteed to remain strictly bounded to at most 5:
   * accumulatorPair (2), layerPingPong (2), backgroundFbo (1).
   */
  public getWorkingSetStats(): {
    accumulatorFbos: number;
    layerPingPongFbos: number;
    backgroundScratchFbos: number;
    totalFbos: number;
    workingDimensions: { width: number; height: number };
    isComposited: boolean;
    lastCompositionKey: string;
  } {
    const accumCount = this.accumulatorPair ? 2 : 0;
    const ppCount = this.layerPingPong ? 2 : 0;
    const bgCount = this.backgroundRenderer.getScratchFbo() ? 1 : 0;
    return {
      accumulatorFbos: accumCount,
      layerPingPongFbos: ppCount,
      backgroundScratchFbos: bgCount,
      totalFbos: accumCount + ppCount + bgCount,
      workingDimensions: { width: this.workingWidth, height: this.workingHeight },
      isComposited: this.isComposited,
      lastCompositionKey: this.lastCompositionKey,
    };
  }

  /**
   * Releases all GPU resources, framebuffers, textures, and shader programs.
   */
  public dispose(): void {
    if (this.accumulatorPair) {
      this.accumulatorPair.dispose();
      this.accumulatorPair = null;
    }

    if (this.layerPingPong) {
      this.layerPingPong.dispose();
      this.layerPingPong = null;
    }

    for (const record of this.assetTextureCache.values()) {
      disposeTexture(this.gl, record);
    }
    this.assetTextureCache.clear();

    this.backgroundRenderer.dispose();
    this.quad.dispose();
    this.effectPrograms.clear();
    this.resourceManager.disposeAll();

    this.isComposited = false;
  }
}
