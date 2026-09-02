import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const HALFTONE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Halftone Fragment Shader.
 * Replicates newspaper/comic monochrome halftone dot pattern with rotated grid
 * from `src/effects/modules/halftone.ts`.
 */
export const HALFTONE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;  // Image native dimensions (width, height)
uniform float u_dotSize;    // Dot diameter (2..24, default 6)
uniform float u_contrast;   // Contrast curve (0.5..2.5, default 1.3)
uniform float u_angle;      // Screen rotation angle in degrees (0..90, default 45)
uniform float u_density;    // Spacing density multiplier (0.5..2.0, default 1.0)
uniform float u_brightness; // Tone offset (-50..50, default 0)

void main() {
    vec4 srcColor = texture(u_texture, v_texCoord);
    if (srcColor.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 pixelPos = v_texCoord * u_resolution;

    float rad = radians(u_angle);
    float cosA = cos(rad);
    float sinA = sin(rad);

    // Rotate coordinate into grid space
    vec2 rotPos = vec2(
        pixelPos.x * cosA + pixelPos.y * sinA,
        -pixelPos.x * sinA + pixelPos.y * cosA
    );

    float stepSize = max(2.0, u_dotSize / max(0.1, u_density));
    float maxRadius = (u_dotSize * 1.41421356) * 0.5;

    // Find nearest rotated grid cell center
    vec2 cellRotCenter = (floor(rotPos / stepSize) + 0.5) * stepSize;

    // Map back cell center to pixel space
    vec2 cellCenter = vec2(
        cellRotCenter.x * cosA - cellRotCenter.y * sinA,
        cellRotCenter.x * sinA + cellRotCenter.y * cosA
    );

    vec2 sampleUV = clamp(cellCenter / u_resolution, 0.0, 1.0);
    vec4 centerSample = texture(u_texture, sampleUV);

    // Compute luminance at cell center (ITU-R BT.601)
    float gray = dot(centerSample.rgb, vec3(0.299, 0.587, 0.114)) + (u_brightness / 255.0);
    gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    // Darker regions produce larger dots
    float dotRadius = (1.0 - gray) * maxRadius;

    // Distance from current fragment pixel to cell center
    float dist = distance(pixelPos, cellCenter);
    float delta = dist - dotRadius;

    float tone;
    if (delta <= -0.5) {
        tone = 0.0;
    } else if (delta >= 0.5) {
        tone = 1.0;
    } else {
        tone = clamp(delta + 0.5, 0.0, 1.0);
    }

    fragColor = vec4(vec3(tone), srcColor.a);
}
`;
