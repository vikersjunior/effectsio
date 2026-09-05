import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const LAYER_BLEND_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Multi-Layer Cross-Layer Blend Shader.
 *
 * Implements the approved 12 W3C separable and non-separable blend modes
 * with mathematically sound premultiplied alpha compositing.
 *
 * Inputs:
 * - `u_backdrop`: Texture Unit 0 (Accumulator A - accumulated backdrop underneath)
 * - `u_source`:   Texture Unit 1 (Layer result - processed layer output)
 * - `u_opacity`:  Layer opacity uniform [0.0, 1.0]
 * - `u_blendMode`: Integer [0..11] matching BlendMode enum
 *
 * Outputs:
 * - Straight RGBA color for intermediate FBO storage, preventing dark fringe artifacts.
 */
export const LAYER_BLEND_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_backdrop; // Accumulated composite underneath
uniform sampler2D u_source;   // Processed layer to blend on top
uniform float u_opacity;      // Layer opacity [0.0, 1.0]
uniform int u_blendMode;      // 0=normal, 1=multiply, 2=screen, 3=overlay,
                              // 4=darken, 5=lighten, 6=color-dodge, 7=color-burn,
                              // 8=hard-light, 9=soft-light, 10=difference, 11=exclusion

// --- W3C Blend Functions (operating on normalized [0, 1] straight RGB) ---

vec3 blendNormal(vec3 dst, vec3 src) {
    return src;
}

vec3 blendMultiply(vec3 dst, vec3 src) {
    return dst * src;
}

vec3 blendScreen(vec3 dst, vec3 src) {
    return dst + src - (dst * src);
}

float overlayChannel(float d, float s) {
    return (d <= 0.5) ? (2.0 * d * s) : (1.0 - 2.0 * (1.0 - d) * (1.0 - s));
}

vec3 blendOverlay(vec3 dst, vec3 src) {
    return vec3(
        overlayChannel(dst.r, src.r),
        overlayChannel(dst.g, src.g),
        overlayChannel(dst.b, src.b)
    );
}

vec3 blendDarken(vec3 dst, vec3 src) {
    return min(dst, src);
}

vec3 blendLighten(vec3 dst, vec3 src) {
    return max(dst, src);
}

float colorDodgeChannel(float d, float s) {
    if (d <= 0.0) return 0.0;
    if (s >= 1.0) return 1.0;
    return min(1.0, d / max(1.0 - s, 0.00001));
}

vec3 blendColorDodge(vec3 dst, vec3 src) {
    return vec3(
        colorDodgeChannel(dst.r, src.r),
        colorDodgeChannel(dst.g, src.g),
        colorDodgeChannel(dst.b, src.b)
    );
}

float colorBurnChannel(float d, float s) {
    if (d >= 1.0) return 1.0;
    if (s <= 0.0) return 0.0;
    return 1.0 - min(1.0, (1.0 - d) / max(s, 0.00001));
}

vec3 blendColorBurn(vec3 dst, vec3 src) {
    return vec3(
        colorBurnChannel(dst.r, src.r),
        colorBurnChannel(dst.g, src.g),
        colorBurnChannel(dst.b, src.b)
    );
}

vec3 blendHardLight(vec3 dst, vec3 src) {
    // Hard-light is equivalent to overlay with backdrop and source swapped
    return blendOverlay(src, dst);
}

float softLightD(float d) {
    if (d <= 0.25) {
        return ((16.0 * d - 12.0) * d + 4.0) * d;
    } else {
        return sqrt(d);
    }
}

float softLightChannel(float d, float s) {
    if (s <= 0.5) {
        return d - (1.0 - 2.0 * s) * d * (1.0 - d);
    } else {
        return d + (2.0 * s - 1.0) * (softLightD(d) - d);
    }
}

vec3 blendSoftLight(vec3 dst, vec3 src) {
    return vec3(
        softLightChannel(dst.r, src.r),
        softLightChannel(dst.g, src.g),
        softLightChannel(dst.b, src.b)
    );
}

vec3 blendDifference(vec3 dst, vec3 src) {
    return abs(dst - src);
}

vec3 blendExclusion(vec3 dst, vec3 src) {
    return dst + src - 2.0 * dst * src;
}

vec3 applyBlendMode(vec3 dst, vec3 src, int mode) {
    switch (mode) {
        case 1:  return blendMultiply(dst, src);
        case 2:  return blendScreen(dst, src);
        case 3:  return blendOverlay(dst, src);
        case 4:  return blendDarken(dst, src);
        case 5:  return blendLighten(dst, src);
        case 6:  return blendColorDodge(dst, src);
        case 7:  return blendColorBurn(dst, src);
        case 8:  return blendHardLight(dst, src);
        case 9:  return blendSoftLight(dst, src);
        case 10: return blendDifference(dst, src);
        case 11: return blendExclusion(dst, src);
        case 0:
        default: return blendNormal(dst, src);
    }
}

void main() {
    vec4 dstSample = texture(u_backdrop, v_texCoord);
    vec4 srcSample = texture(u_source, v_texCoord);

    float dstAlpha = dstSample.a;
    float srcAlpha = srcSample.a * clamp(u_opacity, 0.0, 1.0);

    // Fast path: if both are completely transparent
    if (dstAlpha <= 0.00001 && srcAlpha <= 0.00001) {
        fragColor = vec4(0.0);
        return;
    }

    // Fast path: if top layer is completely transparent, preserve backdrop identically
    if (srcAlpha <= 0.00001) {
        fragColor = dstSample;
        return;
    }

    // Fast path: if backdrop is completely transparent, source passes through with effective opacity
    if (dstAlpha <= 0.00001) {
        fragColor = vec4(srcSample.rgb, srcAlpha);
        return;
    }

    vec3 dstColor = dstSample.rgb;
    vec3 srcColor = srcSample.rgb;

    // 1. Calculate the blended color function B(Cb, Cs)
    vec3 blended = applyBlendMode(dstColor, srcColor, u_blendMode);

    // 2. W3C Porter-Duff Over composite with premultiplied alpha:
    // alpha_out = alpha_src + alpha_dst * (1.0 - alpha_src)
    float outAlpha = srcAlpha + dstAlpha * (1.0 - srcAlpha);

    // C_out_premul = B(Cb, Cs) * alpha_src * alpha_dst
    //              + Cs * alpha_src * (1.0 - alpha_dst)
    //              + Cb * alpha_dst * (1.0 - alpha_src)
    vec3 outRgbPremul = blended * (srcAlpha * dstAlpha)
                      + srcColor * (srcAlpha * (1.0 - dstAlpha))
                      + dstColor * (dstAlpha * (1.0 - srcAlpha));

    // 3. Un-premultiply to store clean straight RGB in intermediate FBO
    vec3 outRgb = clamp(outRgbPremul / max(outAlpha, 0.00001), 0.0, 1.0);

    fragColor = vec4(outRgb, clamp(outAlpha, 0.0, 1.0));
}
`;
