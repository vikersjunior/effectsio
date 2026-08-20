import { DEFAULT_PRESET_ID, type StylePresetDefinition, type StylePresetId } from "./types";

export const STYLE_PRESETS: Record<StylePresetId, StylePresetDefinition> = {
  "chiwara-screen-print": {
    id: "chiwara-screen-print",
    name: "Chiwara Screen Print",
    description: "Multi-pass screen print feel with ink misregistration, subtle grain, and limited ink contrast.",
    params: {
      shadowColor: "#8B1E0F", // Deep terracotta ink
      highlightColor: "#E07A5F", // Vibrant warm red/orange
      paperColor: "#F4F1DE", // Natural cotton paper
      colorLevels: 4,
      halftoneDotSize: 4,
      halftoneAngle: 45,
      halftoneContrast: 60,
      grainIntensity: 25,
      misregistrationShift: 4,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 20,
      brightness: 0,
    },
  },
  "chiwara-blue-cream": {
    id: "chiwara-blue-cream",
    name: "Chiwara Blue/Cream",
    description: "Serigraph aesthetic with deep navy shadows, terracotta highlights, and ivory cream paper.",
    params: {
      shadowColor: "#1D3557", // Deep navy ink
      highlightColor: "#E07A5F", // Terracotta accent ink
      paperColor: "#F4F1DE", // Warm cream paper
      colorLevels: 3,
      halftoneDotSize: 5,
      halftoneAngle: 30,
      halftoneContrast: 70,
      grainIntensity: 20,
      misregistrationShift: 3,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 25,
      brightness: 0,
    },
  },
  "editorial-halftone": {
    id: "editorial-halftone",
    name: "Editorial Halftone",
    description: "Clean publication print aesthetic with strong screen angle dots and rich contrast.",
    params: {
      shadowColor: "#212529", // Charcoal publication ink
      highlightColor: "#495057", // Midtone ink
      paperColor: "#FFFFFF", // Pure white paper
      colorLevels: 6,
      halftoneDotSize: 6,
      halftoneAngle: 45,
      halftoneContrast: 80,
      grainIntensity: 10,
      misregistrationShift: 0,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: false,
      enableGrain: true,
      contrast: 30,
      brightness: 5,
    },
  },
  "vintage-newspaper": {
    id: "vintage-newspaper",
    name: "Vintage Newspaper",
    description: "Coarse newsprint paper texture, heavy ink bleed shift, and high-frequency noise grain.",
    params: {
      shadowColor: "#2B2D42", // Aged newsprint ink
      highlightColor: "#8D99AE", // Faded midtone
      paperColor: "#EDF2F4", // Newsprint paper gray
      colorLevels: 3,
      halftoneDotSize: 8,
      halftoneAngle: 15,
      halftoneContrast: 50,
      grainIntensity: 45,
      misregistrationShift: 6,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 15,
      brightness: 0,
    },
  },
  "poster-print": {
    id: "poster-print",
    name: "Poster Print",
    description: "Bold graphic poster print with high-contrast color quantization and clean edges.",
    params: {
      shadowColor: "#003049", // Deep midnight blue ink
      highlightColor: "#F77F00", // Vibrant poster orange
      paperColor: "#EAE2B7", // Aged poster paper
      colorLevels: 3,
      halftoneDotSize: 3,
      halftoneAngle: 45,
      halftoneContrast: 90,
      grainIntensity: 15,
      misregistrationShift: 2,
      enableHalftone: false,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 40,
      brightness: 0,
    },
  },
  "bw-editorial": {
    id: "bw-editorial",
    name: "Black & White Editorial",
    description: "High-contrast monochrome halftone screen for magazine and press imagery.",
    params: {
      shadowColor: "#000000", // Pure black ink
      highlightColor: "#666666", // Charcoal midtone
      paperColor: "#F8F9FA", // Studio white paper
      colorLevels: 4,
      halftoneDotSize: 5,
      halftoneAngle: 45,
      halftoneContrast: 85,
      grainIntensity: 15,
      misregistrationShift: 0,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: false,
      enableGrain: true,
      contrast: 35,
      brightness: 0,
    },
  },
  "custom-duotone": {
    id: "custom-duotone",
    name: "Custom Duotone",
    description: "Smooth two-color ink mapping duotone effect with fine dot screen.",
    params: {
      shadowColor: "#3D405B", // Slate ink
      highlightColor: "#81B29A", // Sage green highlight ink
      paperColor: "#F2CC8F", // Warm buff paper
      colorLevels: 8,
      halftoneDotSize: 3,
      halftoneAngle: 45,
      halftoneContrast: 50,
      grainIntensity: 10,
      misregistrationShift: 1,
      enableHalftone: true,
      enablePosterize: false,
      enableMisregistration: false,
      enableGrain: true,
      contrast: 10,
      brightness: 0,
    },
  },
  "parcelra-brand": {
    id: "parcelra-brand",
    name: "Parcelra Brand",
    description: "Parcelra corporate visual language duotone with corporate navy and warm coral.",
    params: {
      shadowColor: "#0F172A", // Parcelra slate navy
      highlightColor: "#EC4899", // Parcelra accent rose/coral
      paperColor: "#F8FAFC", // Clean brand white
      colorLevels: 5,
      halftoneDotSize: 4,
      halftoneAngle: 45,
      halftoneContrast: 70,
      grainIntensity: 12,
      misregistrationShift: 2,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 25,
      brightness: 0,
    },
  },
  custom: {
    id: "custom",
    name: "Custom Preset",
    description: "User-defined custom parameter combination.",
    params: {
      shadowColor: "#8B1E0F",
      highlightColor: "#E07A5F",
      paperColor: "#F4F1DE",
      colorLevels: 4,
      halftoneDotSize: 4,
      halftoneAngle: 45,
      halftoneContrast: 60,
      grainIntensity: 25,
      misregistrationShift: 4,
      enableHalftone: true,
      enablePosterize: true,
      enableMisregistration: true,
      enableGrain: true,
      contrast: 20,
      brightness: 0,
    },
  },
};

export { DEFAULT_PRESET_ID };
