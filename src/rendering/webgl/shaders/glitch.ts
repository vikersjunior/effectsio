import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const GLITCH_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 Glitch Fragment Shader.
 * Replicates horizontal band slice displacement, chromatic aberration RGB shift,
 * CRT scanlines, and digital noise spikes from `src/effects/modules/glitch.ts`.
 * Supports dynamic temporal glitch modulation via `u_time`.
 */
export const GLITCH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;  // Overall intensity (0..100, default 40)
uniform float u_rgbShift;   // Horizontal chromatic offset (0..30, default 8)
uniform float u_noise;      // Noise spikes (0..60, default 20)
uniform float u_scanlines;  // CRT scanlines opacity (0..80, default 30)
uniform float u_distortion; // Block tear displacement (0..50, default 15)
uniform float u_time;       // Timeline animation time in seconds

void main() {
    vec4 srcColor = texture(u_texture, v_texCoord);
    if (srcColor.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 pixelPos = v_texCoord * u_resolution;
    float normIntensity = u_intensity / 100.0;

    // 1. Horizontal slice displacement per row band with temporal stepping
    float bandHeight = max(4.0, floor(u_resolution.y / 24.0));
    float bandIndex = floor(pixelPos.y / bandHeight);
    float timeStep = floor(u_time * 6.0);
    float seed = sin(bandIndex * 127.1 + timeStep * 37.89 + 43.2) * 43758.5453;
    float fractSeed = abs(fract(seed));

    float sliceOffset = 0.0;
    if (fractSeed > 0.65) {
        sliceOffset = (fractSeed * 2.0 - 1.0) * (u_distortion * normIntensity * 2.5);
    }

    vec2 shiftedPos = vec2(clamp(pixelPos.x + sliceOffset, 0.0, u_resolution.x - 1.0), pixelPos.y);

    // 2. Chromatic aberration RGB channel separation with subtle temporal jitter
    float shiftJitter = u_time > 0.0 ? sin(u_time * 12.0) * 0.25 : 0.0;
    float shift = floor((u_rgbShift + shiftJitter) * normIntensity + 0.5);
    vec2 redUV = clamp(vec2(shiftedPos.x + shift, shiftedPos.y) / u_resolution, 0.0, 1.0);
    vec2 greenUV = clamp(shiftedPos / u_resolution, 0.0, 1.0);
    vec2 blueUV = clamp(vec2(shiftedPos.x - shift, shiftedPos.y) / u_resolution, 0.0, 1.0);

    float r = texture(u_texture, redUV).r;
    float g = texture(u_texture, greenUV).g;
    float b = texture(u_texture, blueUV).b;

    // 3. Scanline darkening with subtle vertical scroll
    float scanlineOpacity = u_scanlines / 100.0;
    float scanlineShift = floor(u_time * 15.0);
    float scanlineFactor = mod(floor(pixelPos.y + scanlineShift), 2.0) == 0.0 ? 1.0 - scanlineOpacity * 0.45 : 1.0;
    vec3 color = vec3(r, g, b) * scanlineFactor;

    // 4. Digital noise spikes with time modulation
    float noiseAmp = u_noise * normIntensity;
    if (noiseAmp > 0.0) {
        vec2 noiseCoord = pixelPos + vec2(fract(sin(u_time * 19.3) * 1000.0), fract(cos(u_time * 31.7) * 1000.0));
        float pseudoNoise = fract(sin(dot(noiseCoord, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        color += vec3((pseudoNoise * noiseAmp * 1.5) / 255.0);
    }

    fragColor = vec4(clamp(color, 0.0, 1.0), srcColor.a);
}
`;
