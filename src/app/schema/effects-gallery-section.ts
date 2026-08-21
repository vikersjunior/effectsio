import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";
import { PRESET_THUMBNAILS } from "../effects/preset-thumbnails";

export const effectsGallerySection: ToolcraftControlSectionSchema = {
  id: "effects-gallery",
  title: "Creative Effects",
  controls: {
    "effect.selected": {
      applicability: { mode: "always" },
      defaultValue: "original",
      description: "Choose a visual effect preset to apply to the active image.",
      items: [
        {
          alt: "Original (Unaltered photo)",
          src: PRESET_THUMBNAILS.original,
          value: "original",
        },
        {
          alt: "Black & White (Monochrome)",
          src: PRESET_THUMBNAILS["black-and-white"],
          value: "black-and-white",
        },
        {
          alt: "Duotone (Navy to Cyan)",
          src: PRESET_THUMBNAILS.duotone,
          value: "duotone",
        },
        {
          alt: "Posterize (Color Quantization)",
          src: PRESET_THUMBNAILS.posterize,
          value: "posterize",
        },
        {
          alt: "Film Grain (Noise Texture)",
          src: PRESET_THUMBNAILS.grain,
          value: "grain",
        },
        {
          alt: "Halftone (Dot Matrix)",
          src: PRESET_THUMBNAILS.halftone,
          value: "halftone",
        },
        {
          alt: "Screen Print (Serigraphy)",
          src: PRESET_THUMBNAILS["screen-print"],
          value: "screen-print",
        },
        {
          alt: "Vintage Film (Analog Retro)",
          src: PRESET_THUMBNAILS["vintage-film"],
          value: "vintage-film",
        },
        {
          alt: "Glitch (CRT RGB Shift)",
          src: PRESET_THUMBNAILS.glitch,
          value: "glitch",
        },
        {
          alt: "Pixelate (8-Bit Mosaic)",
          src: PRESET_THUMBNAILS.pixelate,
          value: "pixelate",
        },
        {
          alt: "Line Art (Ink Contour)",
          src: PRESET_THUMBNAILS["line-art"],
          value: "line-art",
        },
        {
          alt: "ASCII Art (Terminal Matrix)",
          src: PRESET_THUMBNAILS.ascii,
          value: "ascii",
        },
      ],
      label: "Select Effect",
      performanceReason: "Selects creative effect algorithm to apply to the active image.",
      performanceRole: "responsiveness",
      target: "effect.selected",
      type: "imagePicker",
    },
  },
};
