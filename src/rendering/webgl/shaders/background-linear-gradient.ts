/**
 * GLSL ES 3.00 Linear Gradient Background Shader.
 * Renders a 2-stop linear gradient at angle `u_angle` matching Canvas 2D coordinate convention.
 * Supports continuous angle rotation modulated by `u_time`.
 */
export const BACKGROUND_LINEAR_GRADIENT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_LINEAR_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_startColor;
uniform vec3 u_endColor;
uniform float u_angle;
uniform float u_time;

#define PI 3.14159265358979323846

void main() {
    // Screen coordinates with origin at top-left matching Canvas 2D convention
    vec2 pos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
    vec2 center = u_resolution * 0.5;
    float len = length(u_resolution) * 0.5;

    float effectiveAngle = u_angle + (u_time > 0.0 ? u_time * 15.0 : 0.0);
    float rad = (effectiveAngle - 90.0) * (PI / 180.0);
    vec2 dir = vec2(cos(rad), sin(rad));

    vec2 p0 = center - dir * len;
    vec2 p1 = center + dir * len;
    vec2 v = p1 - p0;

    float denom = dot(v, v);
    float t = denom > 0.0001 ? clamp(dot(pos - p0, v) / denom, 0.0, 1.0) : 0.0;
    vec3 color = mix(u_startColor, u_endColor, t);
    fragColor = vec4(color, 1.0);
}
`;
