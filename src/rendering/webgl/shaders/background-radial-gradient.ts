/**
 * GLSL ES 3.00 Radial Gradient Background Shader.
 * Renders a centered 2-stop radial gradient across the full dimensions.
 * Supports continuous orbital focal drift modulated by `u_time`.
 */
export const BACKGROUND_RADIAL_GRADIENT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_RADIAL_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_startColor;
uniform vec3 u_endColor;
uniform float u_time;

void main() {
    vec2 pos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
    vec2 timeOffset = u_time > 0.0 ? vec2(sin(u_time * 1.2), cos(u_time * 1.2)) * (min(u_resolution.x, u_resolution.y) * 0.08) : vec2(0.0);
    vec2 center = u_resolution * 0.5 + timeOffset;
    float maxRadius = length(u_resolution) * 0.5;

    float dist = length(pos - center);
    float t = clamp(dist / maxRadius, 0.0, 1.0);
    vec3 color = mix(u_startColor, u_endColor, t);
    fragColor = vec4(color, 1.0);
}
`;
