import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const LINE_ART_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Line Art Fragment Shader.
 * Replicates 3x3 Sobel convolution edge detection and stroke weight polarity
 * from `src/effects/modules/line-art.ts`.
 */
export const LINE_ART_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_edgeThreshold; // Sensitivity (10..150, default 45)
uniform float u_lineWeight;    // Stroke thickness multiplier (0.5..5.0, default 1.5)
uniform float u_invert;        // 1.0 for inverted (white lines on black), 0.0 for black lines on white

void main() {
    vec4 srcColor = texture(u_texture, v_texCoord);
    if (srcColor.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 texel = 1.0 / u_resolution;

    // Sample 3x3 neighborhood luminance values (ITU-R BT.601)
    float p00 = dot(texture(u_texture, v_texCoord + vec2(-texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float p01 = dot(texture(u_texture, v_texCoord + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float p02 = dot(texture(u_texture, v_texCoord + vec2(texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));

    float p10 = dot(texture(u_texture, v_texCoord + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float p12 = dot(texture(u_texture, v_texCoord + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));

    float p20 = dot(texture(u_texture, v_texCoord + vec2(-texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float p21 = dot(texture(u_texture, v_texCoord + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float p22 = dot(texture(u_texture, v_texCoord + vec2(texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));

    // Horizontal and vertical Sobel gradients
    float gx = -p00 - 2.0 * p10 - p20 + p02 + 2.0 * p12 + p22;
    float gy = -p00 - 2.0 * p01 - p02 + p20 + 2.0 * p21 + p22;

    float magnitude = length(vec2(gx, gy)) * 255.0;

    // Edge response normalized by threshold and scaled by lineWeight
    float edgeNorm = max(0.0, (magnitude - u_edgeThreshold) / max(1.0, u_edgeThreshold));
    float edgeStrength = clamp(edgeNorm * u_lineWeight, 0.0, 1.0);

    float tone = u_invert > 0.5 ? edgeStrength : (1.0 - edgeStrength);

    fragColor = vec4(vec3(tone), srcColor.a);
}
`;
