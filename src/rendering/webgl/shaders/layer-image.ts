import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const LAYER_IMAGE_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 ImageLayer Texture Fitting Shader.
 *
 * Maps an input asset texture to the destination frame bounds according to
 * the layer's fit mode (`contain` or `cover`), centered without distortion.
 *
 * - `fitMode == 0` (contain): Scales the image to fit entirely within the frame;
 *   pixels outside the image bounds are filled with transparent alpha (vec4(0.0)).
 * - `fitMode == 1` (cover): Scales the image to completely cover the frame,
 *   cropping overflowing edges while preserving aspect ratio.
 */
export const LAYER_IMAGE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_assetTexture;
uniform vec2 u_frameSize;
uniform vec2 u_assetSize;
uniform int u_fitMode; // 0 = contain, 1 = cover

void main() {
    if (u_frameSize.x <= 0.0 || u_frameSize.y <= 0.0 || u_assetSize.x <= 0.0 || u_assetSize.y <= 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    float frameAspect = u_frameSize.x / u_frameSize.y;
    float assetAspect = u_assetSize.x / u_assetSize.y;

    vec2 scale = vec2(1.0);

    if (u_fitMode == 0) {
        // --- Contain Mode ---
        if (assetAspect > frameAspect) {
            // Asset is wider: fits horizontally, letterbox top/bottom
            float s = frameAspect / assetAspect;
            scale = vec2(1.0, 1.0 / s);
        } else {
            // Asset is taller or equal: fits vertically, pillarbox left/right
            float s = assetAspect / frameAspect;
            scale = vec2(1.0 / s, 1.0);
        }
    } else {
        // --- Cover Mode ---
        if (assetAspect > frameAspect) {
            // Asset is wider: covers vertically, crops left/right
            float s = assetAspect / frameAspect;
            scale = vec2(1.0 / s, 1.0);
        } else {
            // Asset is taller: covers horizontally, crops top/bottom
            float s = frameAspect / assetAspect;
            scale = vec2(1.0, 1.0 / s);
        }
    }

    // Transform UV relative to center (0.5, 0.5)
    vec2 centeredUv = (v_texCoord - 0.5) * scale + 0.5;

    // In contain mode, clip pixels outside [0, 1] range to transparent
    if (u_fitMode == 0) {
        if (centeredUv.x < 0.0 || centeredUv.x > 1.0 || centeredUv.y < 0.0 || centeredUv.y > 1.0) {
            fragColor = vec4(0.0);
            return;
        }
    }

    // Clamp centeredUv to avoid bleeding outside textures in cover mode
    vec2 sampledUv = clamp(centeredUv, 0.0, 1.0);
    fragColor = texture(u_assetTexture, sampledUv);
}
`;
