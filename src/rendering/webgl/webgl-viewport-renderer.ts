import { createWebGL2Context } from "./webgl-context";
import { createProgram, setUniform, deleteProgram } from "./webgl-shader";
import { createFullscreenQuad, type FullscreenQuad } from "./webgl-quad";
import { uploadTexture, disposeTexture, type GPUTextureRecord, type TextureSource } from "./webgl-texture";
import { WebGLResourceManager } from "./webgl-resources";
import {
  VIEWPORT_PASS_THROUGH_VERTEX_SHADER,
  VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER,
} from "./shaders/viewport-pass-through";
import type { CompiledProgram } from "./webgl-types";

export interface ViewportRenderParams {
  viewportWidth: number;
  viewportHeight: number;
  imageWidth: number;
  imageHeight: number;
  panX: number;
  panY: number;
  zoom: number;
  splitPosition?: number;
  clearColor?: [number, number, number, number];
}

/**
 * WebGL2 Viewport Renderer.
 *
 * Integrates the WebGL2 rendering pipeline with the EffectsIO viewport matrix:
 * Source Asset Bitmap -> GPU Texture -> Fullscreen Quad -> Viewport Pass-Through Shader -> Canvas.
 */
export class WebGL2ViewportRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private resourceManager: WebGLResourceManager | null = null;
  private program: CompiledProgram | null = null;
  private quad: FullscreenQuad | null = null;
  private activeTextureRecord: GPUTextureRecord | null = null;
  private isContextLost = false;

  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.onContextLostBound = this.handleContextLost.bind(this);
    this.onContextRestoredBound = this.handleContextRestored.bind(this);

    this.initContext();
  }

  private initContext(): boolean {
    try {
      this.gl = createWebGL2Context(this.canvas, {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });

      if (!this.gl) {
        console.warn("WebGL2 context unavailable on target canvas.");
        return false;
      }

      this.resourceManager = new WebGLResourceManager(this.gl);

      this.program = this.resourceManager.registerProgram(
        createProgram(
          this.gl,
          VIEWPORT_PASS_THROUGH_VERTEX_SHADER,
          VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER,
        ),
      );

      this.quad = createFullscreenQuad(this.gl);

      this.canvas.addEventListener("webglcontextlost", this.onContextLostBound);
      this.canvas.addEventListener("webglcontextrestored", this.onContextRestoredBound);

      return true;
    } catch (err) {
      console.warn("Error during WebGL2 renderer initialization:", err);
      this.cleanup();
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.gl !== null && !this.isContextLost && this.program !== null;
  }

  public getContext(): WebGL2RenderingContext | null {
    return this.gl;
  }

  /**
   * Uploads an active asset image source to GPU texture.
   * Reuses the allocated texture if dimensions and asset ID are unchanged.
   */
  public uploadAsset(source: TextureSource, assetId: string): boolean {
    if (!this.gl || this.isContextLost) return false;

    try {
      this.activeTextureRecord = uploadTexture(
        this.gl,
        source,
        assetId,
        this.activeTextureRecord,
      );
      return true;
    } catch (err) {
      console.error(`Failed to upload asset ${assetId} to WebGL2 texture:`, err);
      return false;
    }
  }

  /**
   * Renders the uploaded asset through the pass-through shader using the viewport transformation matrix.
   */
  public render(params: ViewportRenderParams): boolean {
    if (!this.gl || !this.program || !this.quad || !this.activeTextureRecord || this.isContextLost) {
      return false;
    }

    const gl = this.gl;
    const {
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
      panX,
      panY,
      zoom,
      splitPosition,
      clearColor = [0, 0, 0, 0],
    } = params;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return false;
    }

    // Set WebGL viewport to match backing store pixel dimensions
    gl.viewport(0, 0, viewportWidth, viewportHeight);

    // Clear buffer
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program.program);

    // Bind source texture to Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.activeTextureRecord.texture);
    setUniform(gl, this.program, "u_texture", { type: "1i", value: 0 });

    // Set viewport presentation uniforms
    setUniform(gl, this.program, "u_viewportSize", {
      type: "2f",
      value: [viewportWidth, viewportHeight],
    });
    setUniform(gl, this.program, "u_imageSize", {
      type: "2f",
      value: [imageWidth, imageHeight],
    });
    setUniform(gl, this.program, "u_pan", {
      type: "2f",
      value: [panX, panY],
    });
    setUniform(gl, this.program, "u_zoom", {
      type: "1f",
      value: zoom / 100,
    });
    setUniform(gl, this.program, "u_splitPosition", {
      type: "1f",
      value: splitPosition !== undefined ? splitPosition : -1.0,
    });

    // Draw unit quad transformed by vertex shader
    this.quad.draw();

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);

    return true;
  }

  private handleContextLost(e: Event): void {
    e.preventDefault();
    this.isContextLost = true;
    console.warn("WebGL2 context lost in ViewportRenderer.");
  }

  private handleContextRestored(): void {
    console.info("WebGL2 context restored in ViewportRenderer. Re-initializing resources...");
    this.isContextLost = false;
    this.initContext();
  }

  private cleanup(): void {
    if (this.gl && this.activeTextureRecord) {
      disposeTexture(this.gl, this.activeTextureRecord);
      this.activeTextureRecord = null;
    }

    if (this.quad) {
      this.quad.dispose();
      this.quad = null;
    }

    if (this.resourceManager) {
      this.resourceManager.disposeAll();
      this.resourceManager = null;
    }

    this.program = null;
    this.gl = null;
  }

  public dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLostBound);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestoredBound);
    this.cleanup();
  }
}
