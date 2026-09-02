export interface WebGL2Capabilities {
  maxTextureSize: number;
  maxRenderBufferSize: number;
  maxTextureImageUnits: number;
  maxDrawBuffers: number;
  renderer: string;
  vendor: string;
}

export type UniformType =
  | "1f"
  | "2f"
  | "3f"
  | "4f"
  | "1i"
  | "1fv"
  | "2fv"
  | "mat3"
  | "mat4";

export interface UniformValue {
  type: UniformType;
  value: number | number[] | Float32Array | Int32Array;
}

export interface CompiledProgram {
  program: WebGLProgram;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  uniformLocations: Map<string, WebGLUniformLocation>;
  attributeLocations: Map<string, number>;
}

export interface FBOTextureAttachment {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface PingPongTargets {
  primary: FBOTextureAttachment;
  secondary: FBOTextureAttachment;
  currentRead: FBOTextureAttachment;
  currentWrite: FBOTextureAttachment;
}
