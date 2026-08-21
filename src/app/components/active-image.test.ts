import { describe, expect, it } from "vitest";

import { resolveActiveImage, resolveActiveImageId } from "./active-image";

const sourceAssets = [
  { id: "image-a", layerId: "layer-a", sourceTarget: "source.image" },
  { id: "image-b", layerId: "layer-b", sourceTarget: "source.image" },
] as never[];

describe("active image resolution", () => {
  it("uses the selected source image ID instead of the first asset", () => {
    expect(resolveActiveImageId("image-b", "layer-a", sourceAssets)).toBe("image-b");
    expect(resolveActiveImage("image-b", "layer-a", sourceAssets)?.id).toBe("image-b");
  });

  it("uses the first asset only when there is no valid active ID", () => {
    expect(resolveActiveImageId(null, null, sourceAssets)).toBe("image-a");
    expect(resolveActiveImageId("missing", "missing-layer", sourceAssets)).toBe("image-a");
  });
});
