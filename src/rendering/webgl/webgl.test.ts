import { describe, it, expect } from "vitest";
import { isWebGL2Supported, createWebGL2Context } from "./webgl-context";
import { PASS_THROUGH_VERTEX_SHADER, PASS_THROUGH_FRAGMENT_SHADER } from "./shaders/pass-through";
import {
  VIEWPORT_PASS_THROUGH_VERTEX_SHADER,
  VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER,
} from "./shaders/viewport-pass-through";
import { WebGLResourceManager } from "./webgl-resources";
import type { CompiledProgram, FBOTextureAttachment } from "./webgl-types";

describe("Phase 7.2 WebGL2 Texture Upload & Viewport Suite", () => {
  it("provides safe capability detection and fallback", () => {
    const supported = isWebGL2Supported();
    expect(typeof supported).toBe("boolean");
  });

  it("handles null or invalid canvas safely without throwing", () => {
    // @ts-expect-error test null safety
    const gl = createWebGL2Context(null);
    expect(gl).toBeNull();
  });

  it("exports valid GLSL ES 3.00 pass-through shaders", () => {
    expect(PASS_THROUGH_VERTEX_SHADER).toContain("#version 300 es");
    expect(PASS_THROUGH_VERTEX_SHADER).toContain("layout(location = 0) in vec2 a_position;");
    expect(PASS_THROUGH_FRAGMENT_SHADER).toContain("#version 300 es");
    expect(PASS_THROUGH_FRAGMENT_SHADER).toContain("uniform sampler2D u_texture;");
  });

  it("exports valid GLSL ES 3.00 viewport transformation shaders", () => {
    expect(VIEWPORT_PASS_THROUGH_VERTEX_SHADER).toContain("#version 300 es");
    expect(VIEWPORT_PASS_THROUGH_VERTEX_SHADER).toContain("uniform vec2 u_viewportSize;");
    expect(VIEWPORT_PASS_THROUGH_VERTEX_SHADER).toContain("uniform vec2 u_imageSize;");
    expect(VIEWPORT_PASS_THROUGH_VERTEX_SHADER).toContain("uniform vec2 u_pan;");
    expect(VIEWPORT_PASS_THROUGH_VERTEX_SHADER).toContain("uniform float u_zoom;");

    expect(VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER).toContain("#version 300 es");
    expect(VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER).toContain("uniform sampler2D u_texture;");
    expect(VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER).toContain("uniform float u_splitPosition;");
  });

  it("manages GPU resource registration and disposal correctly", () => {
    const mockGl = {
      deleteProgram: () => {},
      deleteShader: () => {},
      deleteFramebuffer: () => {},
      deleteTexture: () => {},
      deleteBuffer: () => {},
      deleteVertexArray: () => {},
    } as unknown as WebGL2RenderingContext;

    const manager = new WebGLResourceManager(mockGl);

    const mockProgram: CompiledProgram = {
      program: {} as WebGLProgram,
      vertexShader: {} as WebGLShader,
      fragmentShader: {} as WebGLShader,
      uniformLocations: new Map(),
      attributeLocations: new Map(),
    };

    const mockFBO: FBOTextureAttachment = {
      framebuffer: {} as WebGLFramebuffer,
      texture: {} as WebGLTexture,
      width: 512,
      height: 512,
    };

    manager.registerProgram(mockProgram);
    manager.registerFBO(mockFBO);

    expect(() => manager.disposeAll()).not.toThrow();
  });
});
