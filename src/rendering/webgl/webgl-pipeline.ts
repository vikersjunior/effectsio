import { createProgram, setUniform, deleteProgram } from "./webgl-shader";
import { createFullscreenQuad, type FullscreenQuad } from "./webgl-quad";
import { PingPongManager } from "./webgl-fbo";
import { WebGLResourceManager } from "./webgl-resources";
import { PASS_THROUGH_VERTEX_SHADER, PASS_THROUGH_FRAGMENT_SHADER } from "./shaders/pass-through";
import type { CompiledProgram } from "./webgl-types";

/**
 * Minimal WebGL2 Pass-Through Pipeline proving the foundational rendering flow:
 * Source Image / ImageData -> WebGL2 Texture -> Fullscreen Quad -> Pass-Through Shader -> Output.
 */
export class WebGL2PassThroughPipeline {
  private gl: WebGL2RenderingContext;
  private quad: FullscreenQuad;
  private program: CompiledProgram;
  private sourceTexture: WebGLTexture | null = null;
  private pingPong: PingPongManager | null = null;
  private resourceManager: WebGLResourceManager;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.resourceManager = new WebGLResourceManager(gl);
    this.quad = createFullscreenQuad(gl);
    this.program = this.resourceManager.registerProgram(
      createProgram(gl, PASS_THROUGH_VERTEX_SHADER, PASS_THROUGH_FRAGMENT_SHADER),
    );
  }

  /**
   * Uploads an HTMLImageElement, ImageBitmap, or ImageData to a GPU texture.
   */
  public uploadSource(source: HTMLImageElement | ImageBitmap | ImageData): void {
    const gl = this.gl;
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
      this.sourceTexture = null;
    }

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create WebGL source texture");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (source instanceof ImageData) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        source.width,
        source.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source.data,
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        source.width,
        source.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    this.sourceTexture = this.resourceManager.registerTexture(texture);

    // Initialize ping-pong FBOs matching source dimensions
    if (!this.pingPong) {
      this.pingPong = new PingPongManager(gl, source.width, source.height);
    } else {
      this.pingPong.resize(source.width, source.height);
    }
  }

  /**
   * Renders the uploaded source texture through the pass-through shader onto the target canvas or FBO.
   */
  public renderToCanvas(targetWidth: number, targetHeight: number): void {
    if (!this.sourceTexture) {
      throw new Error("No source texture uploaded to WebGL2 pipeline");
    }

    const gl = this.gl;

    gl.viewport(0, 0, targetWidth, targetHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Render directly to canvas display buffer

    gl.useProgram(this.program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    setUniform(gl, this.program, "u_texture", { type: "1i", value: 0 });
    setUniform(gl, this.program, "u_resolution", { type: "2f", value: [targetWidth, targetHeight] });
    setUniform(gl, this.program, "u_time", { type: "1f", value: 0 });

    this.quad.draw();

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  /**
   * Renders through the pass-through shader into the ping-pong framebuffer target.
   */
  public renderToFBO(): void {
    if (!this.sourceTexture || !this.pingPong) {
      throw new Error("Pipeline not ready for FBO render");
    }

    const gl = this.gl;
    const writeFBO = this.pingPong.write;

    gl.viewport(0, 0, writeFBO.width, writeFBO.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.framebuffer);

    gl.useProgram(this.program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    setUniform(gl, this.program, "u_texture", { type: "1i", value: 0 });
    setUniform(gl, this.program, "u_resolution", { type: "2f", value: [writeFBO.width, writeFBO.height] });

    this.quad.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);

    this.pingPong.swap();
  }

  /**
   * Releases all GPU resources.
   */
  public dispose(): void {
    if (this.pingPong) {
      this.pingPong.dispose();
      this.pingPong = null;
    }
    this.quad.dispose();
    this.resourceManager.disposeAll();
  }
}
