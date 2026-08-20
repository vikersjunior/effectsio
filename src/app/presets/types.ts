export type StylePresetId =
  | "chiwara-screen-print"
  | "chiwara-blue-cream"
  | "editorial-halftone"
  | "vintage-newspaper"
  | "poster-print"
  | "bw-editorial"
  | "custom-duotone"
  | "parcelra-brand"
  | "custom";

export const DEFAULT_PRESET_ID: StylePresetId = "chiwara-screen-print";

export interface PresetParams {
  presetId: StylePresetId;
  presetName: string;
  shadowColor: string;
  highlightColor: string;
  paperColor: string;
  colorLevels: number; // 2 to 16 for posterization
  halftoneDotSize: number; // 1 to 20
  halftoneAngle: number; // 0 to 90 degrees
  halftoneContrast: number; // 0 to 100
  grainIntensity: number; // 0 to 100
  misregistrationShift: number; // 0 to 15px
  enableHalftone: boolean;
  enablePosterize: boolean;
  enableMisregistration: boolean;
  enableGrain: boolean;
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
}

export interface StylePresetDefinition {
  id: StylePresetId;
  name: string;
  description: string;
  params: Omit<PresetParams, "presetId" | "presetName">;
}
