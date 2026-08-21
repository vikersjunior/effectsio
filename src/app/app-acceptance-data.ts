import type {
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appControlSectionInventory } from "./acceptance/control-section-inventory-list";
import { appAcceptance } from "./acceptance/product-acceptance-list";

export { appAcceptance, appControlSectionInventory };

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
};

export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: { mode: "toolcraft-default" },
    video: { mode: "not-requested" },
  },
  interactionOwnership: [
    {
      alternative: {
        reason:
          "Canvas selection would duplicate the Image Library collection workflow and its upload, delete, and transform actions.",
        surface: "canvas",
      },
      capability: "structured-selection",
      evidence: {
        detail:
          "The requested workflow explicitly uses the Image Library thumbnail grid as the image-selection mechanism.",
        source: "user-request",
      },
      id: "image-library-selection",
      reason:
        "The panel keeps image upload, thumbnail selection, and image-specific actions together in one discoverable collection workflow.",
      surface: "panel",
      target: "source.image",
    },
  ],
  mode: "product",
  productName: "EffectsIO",
  productSummary: "A personal image effects and visual-style workstation for applying repeatable creative treatments to images.",
  requestedBehavior:
    "Upload single or multiple images into the Image Library, select active image, apply creative effects from the gallery (Original, Black & White, Duotone, Posterize, Grain, Halftone, Screen Print, Vintage Film, Glitch, Pixelate, Line Art, ASCII Art), adjust effect parameters in the Adjustments sections, reset effect parameters, preview on canvas with zoom/pan/center/undo/redo, and export images.",
  viewInteraction: {
    mode: "non-spatial",
    reason: "EffectsIO is a 2D image workstation without 3D scene geometry.",
  },
};
