import type { Look } from "../types/look";

export const BUILTIN_LOOKS: Look[] = [
  {
    id: "look-editorial-print",
    name: "Editorial Print",
    category: "editorial",
    description: "Classic magazine publication look with fine halftone, warm duo-toning, and subtle micro-grain.",
    isBuiltIn: true,
    createdAt: 1700000000000,
    effectStack: [
      {
        instanceId: "inst-editorial-1",
        effectId: "halftone",
        enabled: true,
        parameters: { dotSize: 6, angle: 45 },
      },
      {
        instanceId: "inst-editorial-2",
        effectId: "duotone",
        enabled: true,
        parameters: { primaryColor: "#1a1a24", secondaryColor: "#f4eee1" },
      },
      {
        instanceId: "inst-editorial-3",
        effectId: "grain",
        enabled: true,
        parameters: { intensity: 18, size: 1 },
      },
    ],
  },
  {
    id: "look-analog-scanner",
    name: "Analog Scanner",
    category: "retro",
    description: "Vintage flatbed scanner distortion with optical chromatic jitter and film warmth.",
    isBuiltIn: true,
    createdAt: 1700000000001,
    effectStack: [
      {
        instanceId: "inst-analog-1",
        effectId: "glitch",
        enabled: true,
        parameters: { amount: 15, sliceHeight: 12 },
      },
      {
        instanceId: "inst-analog-2",
        effectId: "vintage-film",
        enabled: true,
        parameters: { sepia: 40, vignette: 45 },
      },
      {
        instanceId: "inst-analog-3",
        effectId: "grain",
        enabled: true,
        parameters: { intensity: 25, size: 2 },
      },
    ],
  },
  {
    id: "look-brutalist-poster",
    name: "Brutalist Poster",
    category: "monochrome",
    description: "High-contrast posterized aesthetic with aggressive black & white curves and coarse grain.",
    isBuiltIn: true,
    createdAt: 1700000000002,
    effectStack: [
      {
        instanceId: "inst-brutalist-1",
        effectId: "posterize",
        enabled: true,
        parameters: { levels: 4 },
      },
      {
        instanceId: "inst-brutalist-2",
        effectId: "black-and-white",
        enabled: true,
        parameters: { contrast: 1.6, brightness: -0.05 },
      },
      {
        instanceId: "inst-brutalist-3",
        effectId: "grain",
        enabled: true,
        parameters: { intensity: 30, size: 2 },
      },
    ],
  },
  {
    id: "look-cyberpunk-neon",
    name: "Cyberpunk Neon",
    category: "experimental",
    description: "Futuristic night-city atmosphere with heavy duotone glow, glitch lines, and coarse screen raster.",
    isBuiltIn: true,
    createdAt: 1700000000003,
    effectStack: [
      {
        instanceId: "inst-cyber-1",
        effectId: "glitch",
        enabled: true,
        parameters: { amount: 22, sliceHeight: 16 },
      },
      {
        instanceId: "inst-cyber-2",
        effectId: "duotone",
        enabled: true,
        parameters: { primaryColor: "#0d0221", secondaryColor: "#00f0ff" },
      },
      {
        instanceId: "inst-cyber-3",
        effectId: "halftone",
        enabled: true,
        parameters: { dotSize: 8, angle: 90 },
      },
    ],
  },
  {
    id: "look-risograph-duo",
    name: "Risograph Duo",
    category: "editorial",
    description: "Vibrant spot-color silkscreen print texture with heavy ink grain and color-mapped shadows.",
    isBuiltIn: true,
    createdAt: 1700000000004,
    effectStack: [
      {
        instanceId: "inst-riso-1",
        effectId: "screen-print",
        enabled: true,
        parameters: { inkColor: "#ff2a5f", threshold: 128 },
      },
      {
        instanceId: "inst-riso-2",
        effectId: "grain",
        enabled: true,
        parameters: { intensity: 35, size: 2 },
      },
    ],
  },
  {
    id: "look-ascii-terminal",
    name: "ASCII Terminal",
    category: "retro",
    description: "Retro phosphor CRT green-screen terminal matrix rendering with high-contrast text cells.",
    isBuiltIn: true,
    createdAt: 1700000000005,
    effectStack: [
      {
        instanceId: "inst-ascii-1",
        effectId: "black-and-white",
        enabled: true,
        parameters: { contrast: 1.5, brightness: 0 },
      },
      {
        instanceId: "inst-ascii-2",
        effectId: "ascii",
        enabled: true,
        parameters: { cellSize: 8, colorMode: "green" },
      },
    ],
  },
];
