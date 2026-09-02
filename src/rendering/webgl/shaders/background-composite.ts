/**
 * GLSL ES 3.00 Background Compositing Shader.
 * Composites a generated procedural background behind a processed foreground image,
 * applying canvas framing padding, image corner radius clipping (SDF), drop shadow, and alpha blending.
 */
export const BACKGROUND_COMPOSITE_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const BACKGROUND_COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_backgroundTexture;
uniform sampler2D u_foregroundTexture;

uniform vec2 u_resolution;       // Total canvas dimensions (image + 2*padding)
uniform vec2 u_imageSize;        // Foreground image dimensions
uniform float u_padding;         // Padding in pixels
uniform float u_borderRadius;    // Corner radius in pixels
uniform float u_shadowBlur;      // Shadow blur radius
uniform float u_shadowOpacity;   // Shadow opacity [0.0, 1.0]

void main() {
    // Screen coordinates with origin at top-left
    vec2 pos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);

    // 1. Sample Background Texture
    vec4 bg = texture(u_backgroundTexture, v_texCoord);

    // 2. Drop Shadow Calculation (if framed with padding)
    float shadowAlpha = 0.0;
    if (u_padding > 0.0 && u_shadowOpacity > 0.0 && u_shadowBlur > 0.0) {
        vec2 halfSize = u_imageSize * 0.5;
        vec2 shadowCenter = vec2(u_padding) + halfSize + vec2(0.0, u_shadowBlur * 0.5);
        vec2 sP = pos - shadowCenter;
        vec2 sD = abs(sP) - (halfSize - vec2(u_borderRadius));
        float sSdf = min(max(sD.x, sD.y), 0.0) + length(max(sD, vec2(0.0))) - u_borderRadius;
        shadowAlpha = u_shadowOpacity * smoothstep(u_shadowBlur, -u_shadowBlur * 0.25, sSdf);
    }

    // 3. Foreground Image Sampling with Corner Radius Clipping
    vec2 fgPos = pos - vec2(u_padding);
    vec2 fgUv = fgPos / u_imageSize;
    vec4 fg = vec4(0.0);

    if (fgUv.x >= 0.0 && fgUv.x <= 1.0 && fgUv.y >= 0.0 && fgUv.y <= 1.0) {
        // Sample texture in WebGL coordinate space
        fg = texture(u_foregroundTexture, vec2(fgUv.x, 1.0 - fgUv.y));

        if (u_borderRadius > 0.0) {
            vec2 halfSize = u_imageSize * 0.5;
            vec2 p = fgPos - halfSize;
            vec2 d = abs(p) - (halfSize - vec2(u_borderRadius));
            float sdf = min(max(d.x, d.y), 0.0) + length(max(d, vec2(0.0))) - u_borderRadius;
            float clipMask = smoothstep(0.5, -0.5, sdf);
            fg.a *= clipMask;
        }
    }

    // 4. Alpha Blending: (Background + Shadow) then Foreground Over
    vec4 result = bg;

    if (shadowAlpha > 0.0) {
        vec4 shadow = vec4(0.0, 0.0, 0.0, shadowAlpha);
        result.rgb = mix(result.rgb, shadow.rgb, shadow.a);
        result.a = max(result.a, shadow.a);
    }

    // Alpha-blend foreground over background + shadow
    result.rgb = fg.rgb * fg.a + result.rgb * (1.0 - fg.a);
    result.a = fg.a + result.a * (1.0 - fg.a);

    fragColor = result;
}
`;
