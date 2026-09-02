import type { CompiledProgram, UniformValue } from "./webgl-types";

/**
 * Compiles an individual GLSL shader from source.
 * Throws a descriptive error with shader info log if compilation fails.
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`Failed to create WebGL shader of type ${type}`);
  }

  gl.shaderSource(shader, source.trim());
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const infoLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const shaderTypeName = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    throw new Error(
      `[WebGL2 ${shaderTypeName} Shader Compilation Error]:\n${infoLog}\n\nShader Source:\n${source}`,
    );
  }

  return shader;
}

/**
 * Links a vertex and fragment shader into an active WebGLProgram and introspects active uniforms/attributes.
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): CompiledProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Failed to create WebGL program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const infoLog = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`[WebGL2 Program Link Error]:\n${infoLog}`);
  }

  // Introspect active uniforms and cache their locations
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      const loc = gl.getUniformLocation(program, info.name);
      if (loc) {
        uniformLocations.set(info.name, loc);
      }
    }
  }

  // Introspect active attributes and cache their locations
  const attributeLocations = new Map<string, number>();
  const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES) as number;
  for (let i = 0; i < attributeCount; i++) {
    const info = gl.getActiveAttrib(program, i);
    if (info) {
      const loc = gl.getAttribLocation(program, info.name);
      if (loc !== -1) {
        attributeLocations.set(info.name, loc);
      }
    }
  }

  return {
    program,
    vertexShader,
    fragmentShader,
    uniformLocations,
    attributeLocations,
  };
}

/**
 * Sets a strongly-typed uniform value on a compiled program.
 */
export function setUniform(
  gl: WebGL2RenderingContext,
  program: CompiledProgram,
  name: string,
  uniform: UniformValue,
): void {
  const loc = program.uniformLocations.get(name);
  if (!loc) return;

  switch (uniform.type) {
    case "1f":
      gl.uniform1f(loc, uniform.value as number);
      break;
    case "2f": {
      const v = uniform.value as [number, number];
      gl.uniform2f(loc, v[0], v[1]);
      break;
    }
    case "3f": {
      const v = uniform.value as [number, number, number];
      gl.uniform3f(loc, v[0], v[1], v[2]);
      break;
    }
    case "4f": {
      const v = uniform.value as [number, number, number, number];
      gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
      break;
    }
    case "1i":
      gl.uniform1i(loc, uniform.value as number);
      break;
    case "1fv":
      gl.uniform1fv(loc, uniform.value as Float32Array | number[]);
      break;
    case "2fv":
      gl.uniform2fv(loc, uniform.value as Float32Array | number[]);
      break;
    case "mat3":
      gl.uniformMatrix3fv(loc, false, uniform.value as Float32Array | number[]);
      break;
    case "mat4":
      gl.uniformMatrix4fv(loc, false, uniform.value as Float32Array | number[]);
      break;
  }
}

/**
 * Disposes a compiled program and its attached shaders from GPU memory.
 */
export function deleteProgram(
  gl: WebGL2RenderingContext,
  compiled: CompiledProgram,
): void {
  gl.deleteShader(compiled.vertexShader);
  gl.deleteShader(compiled.fragmentShader);
  gl.deleteProgram(compiled.program);
  compiled.uniformLocations.clear();
  compiled.attributeLocations.clear();
}
