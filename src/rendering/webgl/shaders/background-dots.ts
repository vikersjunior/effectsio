/**
 * GLSL ES 3.00 Procedural Dots Pattern Background Shader.
 * Renders a regular dot matrix grid with antialiased 2px radius dots over a dark base background.
 * Supports continuous coordinate translation modulated by `u_time`.
 */
export const BACKGROUND_DOTS_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_DOTS_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_color;
uniform vec3 u_bgColor;
uniform float u_patternSpacing;
uniform float u_time;
uniform float u_opacity;
uniform float u_bgOpacity;

void main() {
    vec2 timeShift = u_time > 0.0 ? vec2(sin(u_time * 0.8) * 8.0, cos(u_time * 0.8) * 8.0) : vec2(0.0);
    vec2 pos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) + timeShift;
    float spacing = max(8.0, u_patternSpacing);
    vec2 cell = mod(pos, spacing);
    vec2 center = vec2(spacing * 0.5);
    float dist = length(cell - center);

    // Antialiased 2px radius circle
    float dotMask = smoothstep(2.5, 1.5, dist);
    vec3 bg = u_bgColor * u_bgOpacity;
    vec3 color = mix(bg, u_color, dotMask * u_opacity);
    fragColor = vec4(color, 1.0);
}
`;
