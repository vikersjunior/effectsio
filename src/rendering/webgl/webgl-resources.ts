import type { CompiledProgram, FBOTextureAttachment } from "./webgl-types";
import { deleteProgram } from "./webgl-shader";
import { deleteFBOAttachment } from "./webgl-fbo";

/**
 * Tracks and disposes GPU resources associated with a WebGL2 rendering context.
 */
export class WebGLResourceManager {
  private gl: WebGL2RenderingContext;
  private programs = new Set<CompiledProgram>();
  private fbos = new Set<FBOTextureAttachment>();
  private textures = new Set<WebGLTexture>();
  private buffers = new Set<WebGLBuffer>();
  private vaos = new Set<WebGLVertexArrayObject>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  public registerProgram(program: CompiledProgram): CompiledProgram {
    this.programs.add(program);
    return program;
  }

  public registerFBO(fbo: FBOTextureAttachment): FBOTextureAttachment {
    this.fbos.add(fbo);
    return fbo;
  }

  public registerTexture(texture: WebGLTexture): WebGLTexture {
    this.textures.add(texture);
    return texture;
  }

  public registerBuffer(buffer: WebGLBuffer): WebGLBuffer {
    this.buffers.add(buffer);
    return buffer;
  }

  public registerVAO(vao: WebGLVertexArrayObject): WebGLVertexArrayObject {
    this.vaos.add(vao);
    return vao;
  }

  public deleteProgram(program: CompiledProgram): void {
    if (this.programs.has(program)) {
      deleteProgram(this.gl, program);
      this.programs.delete(program);
    }
  }

  public deleteFBO(fbo: FBOTextureAttachment): void {
    if (this.fbos.has(fbo)) {
      deleteFBOAttachment(this.gl, fbo);
      this.fbos.delete(fbo);
    }
  }

  public deleteTexture(texture: WebGLTexture): void {
    if (this.textures.has(texture)) {
      this.gl.deleteTexture(texture);
      this.textures.delete(texture);
    }
  }

  /**
   * Releases all registered GPU resources.
   */
  public disposeAll(): void {
    for (const p of this.programs) {
      deleteProgram(this.gl, p);
    }
    this.programs.clear();

    for (const f of this.fbos) {
      deleteFBOAttachment(this.gl, f);
    }
    this.fbos.clear();

    for (const t of this.textures) {
      this.gl.deleteTexture(t);
    }
    this.textures.clear();

    for (const b of this.buffers) {
      this.gl.deleteBuffer(b);
    }
    this.buffers.clear();

    for (const v of this.vaos) {
      this.gl.deleteVertexArray(v);
    }
    this.vaos.clear();
  }
}
