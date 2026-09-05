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
uniform vec2 u_layerOffset; // (x, y) in UI Frame pixels (x: right, y: down)
uniform vec2 u_layerScale; // (scaleX, scaleY) multipliers >= 0.05
uniform float u_layerRotation; // rotation angle in radians (clockwise)

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

    // Convert WebGL fragment coordinate to UI Frame pixel offset from frame center
    // In UI space, positive X is right and positive Y is down
    vec2 p = vec2((v_texCoord.x - 0.5) * u_frameSize.x, -(v_texCoord.y - 0.5) * u_frameSize.y);

    // 1. Inverse translation
    vec2 p_trans = p - u_layerOffset;

    // 2. Inverse rotation (clockwise in UI space, so inverse rotates by -u_layerRotation)
    float cosR = cos(u_layerRotation);
    float sinR = sin(u_layerRotation);
    vec2 p_rot = vec2(p_trans.x * cosR + p_trans.y * sinR, -p_trans.x * sinR + p_trans.y * cosR);

    // 3. Inverse scale
    vec2 safeScale = max(abs(u_layerScale), vec2(0.001));
    vec2 p_scaled = p_rot / safeScale;

    // Convert back to centered normalized UV offset
    vec2 uvOffset = vec2(p_scaled.x / u_frameSize.x, -p_scaled.y / u_frameSize.y);

    // Apply authoritative fit calculation
    vec2 centeredUv = uvOffset * scale + 0.5;

    // Clip pixels outside [0, 1] range to transparent alpha
    if (centeredUv.x < 0.0 || centeredUv.x > 1.0 || centeredUv.y < 0.0 || centeredUv.y > 1.0) {
        fragColor = vec4(0.0);
        return;
    }

    // Clamp centeredUv to avoid precision bleeding at outer edge
    vec2 sampledUv = clamp(centeredUv, 0.0, 1.0);
    fragColor = texture(u_assetTexture, sampledUv);
}
`;
