/**
 * Standard WebGL2 (GLSL ES 3.00) Full-screen Quad Vertex Shader.
 * Maps quad coordinates [-1.0, 1.0] to clip space and passes UV [0.0, 1.0] to fragment shader.
 */
export const PASS_THROUGH_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Standard WebGL2 (GLSL ES 3.00) Pass-Through Fragment Shader.
 * Samples input texture `u_texture` at `v_texCoord` and outputs unmodified RGBA pixel.
 */
export const PASS_THROUGH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
    // Invert Y for texture sampling if needed, standard GL coords
    fragColor = texture(u_texture, v_texCoord);
}
`;
