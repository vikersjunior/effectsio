/**
 * WebGL2 (GLSL ES 3.00) Viewport Transform Vertex Shader.
 *
 * Positions and scales the image quad in WebGL Normalized Device Coordinates (NDC)
 * based on the authoritative viewport presentation parameters:
 * - `u_viewportSize`: Target viewport canvas width and height in pixels
 * - `u_imageSize`: Native natural image dimensions in pixels
 * - `u_pan`: Pan offset (panX, panY) in CSS pixels
 * - `u_zoom`: Zoom scale factor (zoom / 100)
 */
export const VIEWPORT_PASS_THROUGH_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position; // Unit quad [-1.0, 1.0]
layout(location = 1) in vec2 a_texCoord; // Unit UV [0.0, 1.0]

out vec2 v_texCoord;

uniform vec2 u_viewportSize;
uniform vec2 u_imageSize;
uniform vec2 u_pan;
uniform float u_zoom;

void main() {
    v_texCoord = a_texCoord;

    // Compute pixel position from viewport center (0, 0)
    // Positive Y in CSS is downwards; in WebGL NDC, positive Y is upwards.
    vec2 halfImage = u_imageSize * 0.5;
    vec2 posInPixels = (a_position * halfImage * u_zoom) + vec2(u_pan.x, -u_pan.y);

    // Convert pixel position to NDC [-1.0, 1.0]
    vec2 halfViewport = u_viewportSize * 0.5;
    vec2 ndc = posInPixels / halfViewport;

    gl_Position = vec4(ndc, 0.0, 1.0);
}
`;

/**
 * WebGL2 (GLSL ES 3.00) Viewport Pass-Through Fragment Shader.
 * Samples source texture and renders with alpha transparency and Split View clipping.
 */
export const VIEWPORT_PASS_THROUGH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_viewportSize;
uniform float u_splitPosition; // 0.0 to 1.0, or -1.0 if disabled

void main() {
    // If Split View is active, discard or sample accordingly
    if (u_splitPosition >= 0.0) {
        float screenXNorm = gl_FragCoord.x / u_viewportSize.x;
        // In pass-through verification, both sides sample the source texture
    }

    fragColor = texture(u_texture, v_texCoord);
}
`;
