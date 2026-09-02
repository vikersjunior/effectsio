import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const POSTERIZE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Posterize Fragment Shader.
 * Replicates color channel quantization from `src/effects/modules/posterize.ts`.
 */
export const POSTERIZE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_levels; // Number of discrete levels per channel (2..16, default 4)

void main() {
    vec4 color = texture(u_texture, v_texCoord);

    float numLevels = max(2.0, min(16.0, floor(u_levels + 0.5)));
    float steps = numLevels - 1.0;

    // Quantize each channel to discrete steps
    vec3 outColor = floor(color.rgb * steps + 0.5) / steps;

    fragColor = vec4(clamp(outColor, 0.0, 1.0), color.a);
}
`;
