/**
 * GLSL ES 3.00 Procedural Grid Pattern Background Shader.
 * Renders an antialiased 1px orthographic line grid over a dark base background.
 * Supports continuous coordinate flow modulated by `u_time`.
 */
export const BACKGROUND_GRID_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_GRID_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_patternSpacing;
uniform float u_time;
uniform float u_opacity;

const vec3 BASE_BG = vec3(13.0 / 255.0, 13.0 / 255.0, 18.0 / 255.0);

void main() {
    vec2 timeShift = u_time > 0.0 ? vec2(u_time * 6.0, u_time * 4.0) : vec2(0.0);
    vec2 pos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) + timeShift;
    float spacing = max(8.0, u_patternSpacing);
    vec2 cell = mod(pos, spacing);

    // Distance to nearest grid line (horizontal and vertical)
    float distToLineX = min(cell.x, spacing - cell.x);
    float distToLineY = min(cell.y, spacing - cell.y);
    float distToLine = min(distToLineX, distToLineY);

    // Antialiased 1px grid line
    float lineMask = smoothstep(1.0, 0.0, distToLine);
    vec3 color = mix(BASE_BG, u_color, lineMask * u_opacity);
    fragColor = vec4(color, 1.0);
}
`;
