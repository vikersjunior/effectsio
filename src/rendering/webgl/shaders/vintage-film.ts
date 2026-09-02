import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const VINTAGE_FILM_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Vintage Film Fragment Shader.
 * Replicates desaturation, contrast, matte lifted blacks, lens vignette, and analog film grain
 * from `src/effects/modules/vintage-film.ts`.
 * Supports dynamic film grain shimmer and analog warmth flutter via `u_time`.
 */
export const VINTAGE_FILM_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_grain;      // Grain intensity (0..80, default 30)
uniform float u_fade;       // Lifted black floor (0..60, default 25)
uniform float u_contrast;   // Contrast curve (0.5..2.0, default 1.1)
uniform float u_saturation; // Color saturation level (0.0..2.0, default 0.8)
uniform float u_vignette;   // Optical vignette (0..100, default 40)
uniform float u_time;       // Timeline animation time in seconds

void main() {
    vec4 srcColor = texture(u_texture, v_texCoord);
    if (srcColor.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec3 color = srcColor.rgb;
    vec2 pixelPos = v_texCoord * u_resolution;
    vec2 center = u_resolution * 0.5;

    // 1. Desaturate towards muted vintage tones
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, u_saturation);

    // 2. Adjust contrast
    color = (color - 0.5) * u_contrast + 0.5;

    // 3. Vintage color grading: warm highlights, cyan-tinted matte shadows with subtle temporal warmth
    float fadeNorm = u_fade / 255.0;
    vec3 fadeTint = vec3(u_fade * 0.9 / 255.0, u_fade * 0.95 / 255.0, u_fade * 1.15 / 255.0);
    float subtleFlicker = u_time > 0.0 ? sin(u_time * 7.5) * (1.5 / 255.0) : 0.0;
    vec3 lumaWarmth = vec3(gray * (14.0 / 255.0) + subtleFlicker, gray * (8.0 / 255.0), 0.0);
    color = color * (1.0 - fadeNorm) + fadeTint + lumaWarmth;

    // 4. Lens vignette
    float maxDistSq = dot(center, center);
    float vigStrength = (u_vignette / 100.0) * 0.65;
    if (vigStrength > 0.0) {
        vec2 d = pixelPos - center;
        float distSq = dot(d, d);
        float vigFactor = max(0.0, 1.0 - (distSq / maxDistSq) * vigStrength);
        color *= vigFactor;
    }

    // 5. Dynamic analog film grain noise
    if (u_grain > 0.0) {
        vec2 grainCoord = pixelPos + vec2(
            fract(sin(u_time * 23.4) * 43758.5),
            fract(cos(u_time * 47.1) * 23421.6)
        ) * 1000.0;
        float pseudoNoise = fract(sin(dot(grainCoord, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        color += vec3((pseudoNoise * u_grain * 0.6) / 255.0);
    }

    fragColor = vec4(clamp(color, 0.0, 1.0), srcColor.a);
}
`;
