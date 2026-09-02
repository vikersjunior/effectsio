import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const SCREEN_PRINT_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Screen Print Fragment Shader.
 * Replicates dual-plate serigraphy screen print with ink registration offsets,
 * subtractive ink blending, and paper texture grain from `src/effects/modules/screen-print.ts`.
 */
export const SCREEN_PRINT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec3 u_inkColor1;          // Primary ink normalized RGB
uniform vec3 u_inkColor2;          // Secondary ink normalized RGB
uniform float u_inkDensity;        // Ink density (0.5..2.0, default 1.0)
uniform float u_halftoneSize;      // Halftone dot grid size (2..20, default 8)
uniform float u_grain;             // Paper grain noise (0..60, default 20)
uniform float u_contrast;          // Contrast curve (0.5..2.5, default 1.4)
uniform float u_registrationOffset;// Misaligned plate offset (0..12, default 3)

void main() {
    vec4 srcColor = texture(u_texture, v_texCoord);
    if (srcColor.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 pixelPos = v_texCoord * u_resolution;

    // Angles for plate separation (15° and 75°)
    float rad1 = radians(15.0);
    float cos1 = cos(rad1);
    float sin1 = sin(rad1);

    float rad2 = radians(75.0);
    float cos2 = cos(rad2);
    float sin2 = sin(rad2);

    float stepSize = max(2.0, u_halftoneSize / max(0.1, u_inkDensity));
    float maxRadius = (u_halftoneSize * 1.41421356) * 0.5;

    // Paper base tone (warm natural paper: rgb(250, 248, 244))
    vec3 paperBase = vec3(250.0 / 255.0, 248.0 / 255.0, 244.0 / 255.0);

    // Plate 1: Primary ink (Shadows/Midtones)
    vec2 rx1 = vec2(pixelPos.x * cos1 + pixelPos.y * sin1, -pixelPos.x * sin1 + pixelPos.y * cos1);
    vec2 cell1Rx = (floor(rx1 / stepSize) + 0.5) * stepSize;
    vec2 cx1 = vec2(cell1Rx.x * cos1 - cell1Rx.y * sin1, cell1Rx.x * sin1 + cell1Rx.y * cos1);
    vec2 uv1 = clamp(cx1 / u_resolution, 0.0, 1.0);
    vec4 c1Sample = texture(u_texture, uv1);
    float gray1 = dot(c1Sample.rgb, vec3(0.299, 0.587, 0.114));
    float norm1 = clamp((gray1 - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    float dotRadius1 = (1.0 - norm1) * maxRadius;
    float dist1 = distance(pixelPos, cx1);
    float cov1 = clamp(dotRadius1 - dist1 + 0.5, 0.0, 1.0) * u_inkDensity;

    // Plate 2: Secondary ink (Offset registration & Midtones)
    vec2 offPos = vec2(pixelPos.x - u_registrationOffset, pixelPos.y + floor(u_registrationOffset * 0.5 + 0.5));
    vec2 rx2 = vec2(offPos.x * cos2 + offPos.y * sin2, -offPos.x * sin2 + offPos.y * cos2);
    vec2 cell2Rx = (floor(rx2 / stepSize) + 0.5) * stepSize;
    vec2 cx2 = vec2(cell2Rx.x * cos2 - cell2Rx.y * sin2, cell2Rx.x * sin2 + cell2Rx.y * cos2);
    vec2 uv2 = clamp(cx2 / u_resolution, 0.0, 1.0);
    vec4 c2Sample = texture(u_texture, uv2);
    float gray2 = dot(c2Sample.rgb, vec3(0.299, 0.587, 0.114));
    float contrasted2 = (abs(gray2 - 0.5) * 2.0 - 0.5) * u_contrast + 0.5;
    float norm2 = clamp(1.0 - contrasted2, 0.0, 1.0);
    float dotRadius2 = norm2 * maxRadius * 0.85;
    float dist2 = distance(offPos, cx2);
    float cov2 = clamp(dotRadius2 - dist2 + 0.5, 0.0, 1.0) * u_inkDensity;

    // Subtractive ink multiplication onto paper base
    vec3 outColor = paperBase * (vec3(1.0) - cov1 * (vec3(1.0) - u_inkColor1)) * (vec3(1.0) - cov2 * (vec3(1.0) - u_inkColor2));

    // Tactile paper grain noise
    if (u_grain > 0.0) {
        float pseudoNoise = fract(sin(dot(pixelPos, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        outColor += vec3((pseudoNoise * u_grain * 0.5) / 255.0);
    }

    fragColor = vec4(clamp(outColor, 0.0, 1.0), srcColor.a);
}
`;
