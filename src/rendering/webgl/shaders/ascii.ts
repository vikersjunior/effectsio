import { PASS_THROUGH_VERTEX_SHADER } from "./pass-through";

export const ASCII_VERTEX_SHADER = PASS_THROUGH_VERTEX_SHADER;

/**
 * GLSL ES 3.00 ASCII Art Fragment Shader.
 * Replicates luminance-mapped 5x7 bitmap glyph cell matrix rendering with
 * monochrome, full-color, green phosphor, and amber CRT palettes from `src/effects/modules/ascii.ts`.
 */
export const ASCII_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_fontSize;        // Cell font size (6..24, default 10)
uniform float u_characterDensity;// 0.0: standard, 1.0: blocks, 2.0: minimal
uniform float u_colorMode;       // 0.0: monochrome, 1.0: color, 2.0: greenPhosphor, 3.0: amberCRT

// Decodes a 5x7 bit pattern for procedural ASCII glyphs
// Returns 1.0 if the (col, row) pixel within cell is active, 0.0 otherwise
float getGlyphPixel(int charType, int col, int row) {
    // Row is 0..6 (top to bottom), Col is 0..4 (left to right)
    // 0: Space
    if (charType == 0) return 0.0;
    // 1: Dot '.' (row 5,6; col 2,3)
    if (charType == 1) return (row >= 5 && (col == 2 || col == 3)) ? 1.0 : 0.0;
    // 2: Colon ':'
    if (charType == 2) return ((row == 1 || row == 2 || row == 4 || row == 5) && (col == 2 || col == 3)) ? 1.0 : 0.0;
    // 3: Minus '-'
    if (charType == 3) return (row == 3) ? 1.0 : 0.0;
    // 4: Equals '='
    if (charType == 4) return (row == 2 || row == 4) ? 1.0 : 0.0;
    // 5: Plus '+'
    if (charType == 5) return (row == 3 || col == 2) ? 1.0 : 0.0;
    // 6: Asterisk '*'
    if (charType == 6) return (row == 3 || col == 2 || (row == col + 1) || (row + col == 5)) ? 1.0 : 0.0;
    // 7: Hash '#'
    if (charType == 7) return (row == 1 || row == 3 || row == 5 || col == 1 || col == 3) ? 1.0 : 0.0;
    // 8: Percent '%'
    if (charType == 8) return (row + col == 6 || (row <= 1 && col <= 1) || (row >= 4 && col >= 3)) ? 1.0 : 0.0;
    // 9: At '@'
    if (charType == 9) return (row == 0 || row == 6 || col == 0 || col == 4 || row == 3 || col == 2) ? 1.0 : 0.0;
    // 10: Light Shade '░'
    if (charType == 10) return (mod(float(col + row * 2), 3.0) < 1.0) ? 1.0 : 0.0;
    // 11: Medium Shade '▒'
    if (charType == 11) return (mod(float(col + row), 2.0) == 0.0) ? 1.0 : 0.0;
    // 12: Dark Shade '▓'
    if (charType == 12) return (mod(float(col + row * 2), 3.0) >= 1.0) ? 1.0 : 0.0;
    // 13: Solid Block '█'
    if (charType == 13) return 1.0;

    return 0.0;
}

void main() {
    vec2 pixelPos = v_texCoord * u_resolution;

    float cellH = max(6.0, floor(u_fontSize + 0.5));
    float cellW = max(4.0, floor(u_fontSize * 0.7 + 0.5));

    // Cell index and sample center
    vec2 cellIdx = floor(pixelPos / vec2(cellW, cellH));
    vec2 cellCenter = (cellIdx + 0.5) * vec2(cellW, cellH);
    vec2 sampleUV = clamp(cellCenter / u_resolution, 0.0, 1.0);

    vec4 cellSample = texture(u_texture, sampleUV);
    if (cellSample.a == 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    float gray = dot(cellSample.rgb, vec3(0.299, 0.587, 0.114));
    float norm = clamp(gray, 0.0, 1.0);

    // Pick glyph based on ramp
    int charType = 0;
    if (u_characterDensity < 0.5) {
        // Standard: ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "]
        int idx = int(floor((1.0 - norm) * 10.0));
        if (idx <= 0) charType = 9;      // @
        else if (idx == 1) charType = 8; // %
        else if (idx == 2) charType = 7; // #
        else if (idx == 3) charType = 6; // *
        else if (idx == 4) charType = 5; // +
        else if (idx == 5) charType = 4; // =
        else if (idx == 6) charType = 3; // -
        else if (idx == 7) charType = 2; // :
        else if (idx == 8) charType = 1; // .
        else charType = 0;               // Space
    } else if (u_characterDensity < 1.5) {
        // Blocks: ["█", "▓", "▒", "░", " "]
        int idx = int(floor((1.0 - norm) * 5.0));
        if (idx <= 0) charType = 13;     // █
        else if (idx == 1) charType = 12;// ▓
        else if (idx == 2) charType = 11;// ▒
        else if (idx == 3) charType = 10;// ░
        else charType = 0;               // Space
    } else {
        // Minimal: ["#", "+", "-", ".", " "]
        int idx = int(floor((1.0 - norm) * 5.0));
        if (idx <= 0) charType = 7;      // #
        else if (idx == 1) charType = 5; // +
        else if (idx == 2) charType = 3; // -
        else if (idx == 3) charType = 1; // .
        else charType = 0;               // Space
    }

    // Relative position within cell [0..cellW, 0..cellH]
    vec2 posInCell = mod(pixelPos, vec2(cellW, cellH));
    int col = clamp(int(floor((posInCell.x / cellW) * 5.0)), 0, 4);
    int row = clamp(int(floor((posInCell.y / cellH) * 7.0)), 0, 6);

    float isGlyph = getGlyphPixel(charType, col, row);

    // Terminal background: rgb(12, 13, 14)
    vec3 bgColor = vec3(12.0 / 255.0, 13.0 / 255.0, 14.0 / 255.0);

    // Foreground color palettes
    vec3 fgColor = vec3(gray);
    if (u_colorMode > 0.5 && u_colorMode < 1.5) {
        // Color
        fgColor = cellSample.rgb;
    } else if (u_colorMode > 1.5 && u_colorMode < 2.5) {
        // Green Phosphor
        fgColor = vec3(gray * 0.2, gray, gray * 0.3);
    } else if (u_colorMode > 2.5) {
        // Amber CRT
        fgColor = vec3(gray, gray * 0.7, gray * 0.15);
    }

    vec3 finalColor = mix(bgColor, fgColor, isGlyph);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), cellSample.a);
}
`;
