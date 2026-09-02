import type { WebGL2Capabilities } from "./webgl-types";

export interface CreateWebGL2ContextOptions {
  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: "default" | "high-performance" | "low-power";
}

/**
 * Safely creates a WebGL2 rendering context on a given canvas.
 * Returns null if WebGL2 is not supported or context creation fails,
 * ensuring the application never crashes on unsupported hardware.
 */
export function createWebGL2Context(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options?: CreateWebGL2ContextOptions,
): WebGL2RenderingContext | null {
  if (!canvas) return null;

  try {
    const gl = canvas.getContext("webgl2", {
      alpha: options?.alpha ?? true,
      depth: options?.depth ?? false,
      stencil: options?.stencil ?? false,
      antialias: options?.antialias ?? false,
      premultipliedAlpha: options?.premultipliedAlpha ?? false,
      preserveDrawingBuffer: options?.preserveDrawingBuffer ?? true,
      powerPreference: options?.powerPreference ?? "high-performance",
    }) as WebGL2RenderingContext | null;

    return gl;
  } catch (err) {
    console.warn("Failed to initialize WebGL2 context:", err);
    return null;
  }
}

/**
 * Checks whether WebGL2 is supported in the current runtime environment.
 */
export function isWebGL2Supported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl2");
    const supported = gl !== null;
    // Clean up test context
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
    return supported;
  } catch {
    return false;
  }
}

/**
 * Inspects and returns the hardware/driver capabilities of an active WebGL2 context.
 */
export function getWebGL2Capabilities(gl: WebGL2RenderingContext): WebGL2Capabilities {
  const dbgExt = gl.getExtension("WEBGL_debug_renderer_info");

  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS) as number,
    vendor: dbgExt
      ? (gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) as string)
      : (gl.getParameter(gl.VENDOR) as string),
    renderer: dbgExt
      ? (gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) as string)
      : (gl.getParameter(gl.RENDERER) as string),
  };
}
