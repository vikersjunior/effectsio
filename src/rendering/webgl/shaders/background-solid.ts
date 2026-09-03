/**
 * GLSL ES 3.00 Solid Color Background Shader.
 * Renders uniform background color `u_color` at alpha 1.0.
 */
export const BACKGROUND_SOLID_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_SOLID_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec3 u_color;
uniform float u_opacity;

void main() {
    fragColor = vec4(u_color, u_opacity);
}
`;
