import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const BLACK_AND_WHITE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Black & White Fragment Shader.
 * Replicates the exact luminance conversion (ITU-R BT.601), contrast curve,
 * and warmth tint from `src/effects/modules/black-and-white.ts`.
 */
export const BLACK_AND_WHITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_contrast; // default 1.2
uniform float u_warmth;   // default 0.0, range -50 to 50

void main() {
    vec4 color = texture(u_texture, v_texCoord);

    // ITU-R BT.601 luminance coefficients (matches rgbToGrayscale on CPU)
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Contrast adjustment centered at 0.5 (128 in [0..255] space)
    gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    // Warmth offset normalized to [0..1]
    float w = u_warmth / 255.0;

    vec3 outColor = vec3(
        clamp(gray + w, 0.0, 1.0),
        clamp(gray + w * 0.5, 0.0, 1.0),
        clamp(gray - w, 0.0, 1.0)
    );

    fragColor = vec4(outColor, color.a);
}
`;
