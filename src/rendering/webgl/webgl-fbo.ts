import type { FBOTextureAttachment, PingPongTargets } from "./webgl-types";

/**
 * Creates a texture-backed Framebuffer Object (FBO) for offscreen multi-pass rendering.
 */
export function createFBOAttachment(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): FBOTextureAttachment {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL Texture for FBO");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    gl.deleteTexture(texture);
    throw new Error("Failed to create WebGL Framebuffer");
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    throw new Error(`Framebuffer incomplete. Status code: ${status}`);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    framebuffer,
    texture,
    width,
    height,
  };
}

/**
 * Disposes an FBO texture attachment and releases its GPU memory.
 */
export function deleteFBOAttachment(
  gl: WebGL2RenderingContext,
  attachment: FBOTextureAttachment,
): void {
  gl.deleteFramebuffer(attachment.framebuffer);
  gl.deleteTexture(attachment.texture);
}

/**
 * Manages dual ping-pong framebuffer targets for sequential multi-pass shader execution.
 */
export class PingPongManager {
  private gl: WebGL2RenderingContext;
  private targets: PingPongTargets;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    const primary = createFBOAttachment(gl, width, height);
    const secondary = createFBOAttachment(gl, width, height);

    this.targets = {
      primary,
      secondary,
      currentRead: primary,
      currentWrite: secondary,
    };
  }

  public get read(): FBOTextureAttachment {
    return this.targets.currentRead;
  }

  public get write(): FBOTextureAttachment {
    return this.targets.currentWrite;
  }

  /**
   * Swaps the read and write targets so Pass N+1 reads the output of Pass N.
   */
  public swap(): void {
    const prevRead = this.targets.currentRead;
    this.targets.currentRead = this.targets.currentWrite;
    this.targets.currentWrite = prevRead;
  }

  /**
   * Resizes both ping-pong buffers when viewport or asset dimensions change.
   */
  public resize(width: number, height: number): void {
    if (this.targets.primary.width === width && this.targets.primary.height === height) {
      return;
    }

    deleteFBOAttachment(this.gl, this.targets.primary);
    deleteFBOAttachment(this.gl, this.targets.secondary);

    const primary = createFBOAttachment(this.gl, width, height);
    const secondary = createFBOAttachment(this.gl, width, height);

    this.targets = {
      primary,
      secondary,
      currentRead: primary,
      currentWrite: secondary,
    };
  }

  /**
   * Disposes both ping-pong targets and cleans up GPU resources.
   */
  public dispose(): void {
    deleteFBOAttachment(this.gl, this.targets.primary);
    deleteFBOAttachment(this.gl, this.targets.secondary);
  }
}
