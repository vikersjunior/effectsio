export interface FullscreenQuad {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  draw: () => void;
  dispose: () => void;
}

/**
 * Creates a minimal 2D full-screen quad (2 triangles / 4 vertices) for image processing.
 *
 * Attribute 0: `a_position` (vec2) - coordinates [-1.0, 1.0]
 * Attribute 1: `a_texCoord` (vec2) - coordinates [0.0, 1.0]
 */
export function createFullscreenQuad(gl: WebGL2RenderingContext): FullscreenQuad {
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error("Failed to create WebGL Vertex Array Object");
  }

  const vbo = gl.createBuffer();
  if (!vbo) {
    gl.deleteVertexArray(vao);
    throw new Error("Failed to create WebGL Buffer");
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // Interleaved Position (X, Y) and Texture UV (U, V)
  // Two triangles covering full clip-space: [-1, -1] to [1, 1]
  const quadVertices = new Float32Array([
    //  X,     Y,    U,   V
    -1.0, -1.0,  0.0, 0.0,
     1.0, -1.0,  1.0, 0.0,
    -1.0,  1.0,  0.0, 1.0,
    -1.0,  1.0,  0.0, 1.0,
     1.0, -1.0,  1.0, 0.0,
     1.0,  1.0,  1.0, 1.0,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  const F32_SIZE = Float32Array.BYTES_PER_ELEMENT;
  const STRIDE = 4 * F32_SIZE;

  // a_position (index 0)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);

  // a_texCoord (index 1)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 2 * F32_SIZE);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const draw = () => {
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    gl.deleteBuffer(vbo);
    gl.deleteVertexArray(vao);
  };

  return {
    vao,
    vbo,
    draw,
    dispose,
  };
}
