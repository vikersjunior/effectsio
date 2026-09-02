import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const DUOTONE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Duotone Fragment Shader.
 * Replicates two-color gradient tone mapping between shadow and highlight colors
 * with power-law contrast curve from `src/effects/modules/duotone.ts`.
 */
export const DUOTONE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec3 u_shadowColor;    // Normalized RGB [0..1]
uniform vec3 u_highlightColor; // Normalized RGB [0..1]
uniform float u_contrast;      // Gradient transition steepness (default 1.0)

void main() {
    vec4 color = texture(u_texture, v_texCoord);

    // Luminance conversion (ITU-R BT.601)
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Contrast curve via power-law
    float t = gray;
    if (u_contrast != 1.0) {
        t = clamp(pow(max(gray, 0.0001), u_contrast), 0.0, 1.0);
    }

    // Linear interpolation between shadow and highlight tones
    vec3 outColor = mix(u_shadowColor, u_highlightColor, t);

    fragColor = vec4(outColor, color.a);
}
`;
