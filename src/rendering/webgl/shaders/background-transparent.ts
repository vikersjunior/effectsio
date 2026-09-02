/**
 * GLSL ES 3.00 Transparent Background Shader.
 * Clears background target to full alpha transparency vec4(0.0).
 */
export const BACKGROUND_TRANSPARENT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_TRANSPARENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(0.0, 0.0, 0.0, 0.0);
}
`;
