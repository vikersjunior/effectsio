import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const GRAIN_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Film Grain Fragment Shader.
 * Replicates organic monochromatic film noise over the image from `src/effects/modules/grain.ts`.
 * Supports dynamic animated grain noise modulated by `u_time`.
 */
export const GRAIN_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity; // Noise amplitude percentage (5..100, default 35)
uniform float u_time;

// High-frequency pseudo-random 2D hash function with deterministic time modulation
float hash(vec2 p, float t) {
    vec2 timeOffset = vec2(
        fract(sin(t * 17.135) * 43758.5453),
        fract(cos(t * 29.719) * 23421.6312)
    );
    return fract(sin(dot(p + timeOffset * 1000.0, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec4 color = texture(u_texture, v_texCoord);

    // Compute pixel-aligned coordinate for deterministic grain distribution
    vec2 pixelCoord = v_texCoord * u_resolution;
    float maxNoise = (u_intensity / 100.0) * (128.0 / 255.0);
    float noise = (hash(pixelCoord, u_time) - 0.5) * maxNoise;

    vec3 outColor = clamp(color.rgb + vec3(noise), 0.0, 1.0);

    fragColor = vec4(outColor, color.a);
}
`;
