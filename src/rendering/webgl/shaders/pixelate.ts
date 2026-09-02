import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const PIXELATE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Pixelate Fragment Shader.
 * Replicates mosaic block pixelation from `src/effects/modules/pixelate.ts`.
 */
export const PIXELATE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution; // Image native dimensions (width, height)
uniform float u_blockSize; // Block grid size (2..64, default 12)

void main() {
    float blockSize = max(2.0, min(64.0, floor(u_blockSize + 0.5)));
    vec2 pixelPos = v_texCoord * u_resolution;

    // Determine center of current grid block
    vec2 blockCenter = (floor(pixelPos / blockSize) + 0.5) * blockSize;
    vec2 sampleUV = clamp(blockCenter / u_resolution, 0.0, 1.0);

    fragColor = texture(u_texture, sampleUV);
}
`;
