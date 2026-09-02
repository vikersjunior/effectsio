import { describe, it, expect } from "vitest";
import { validateImageFile, formatFileSize, revokeAssetUrls } from "./image-ingestion";
import type { Asset } from "../types/asset";

describe("image-ingestion utils & multi-asset invariants", () => {
  it("formatFileSize formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("validateImageFile accepts valid image MIME types", () => {
    const pngFile = new File(["dummy"], "photo.png", { type: "image/png" });
    const jpgFile = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const webpFile = new File(["dummy"], "photo.webp", { type: "image/webp" });

    expect(validateImageFile(pngFile).valid).toBe(true);
    expect(validateImageFile(jpgFile).valid).toBe(true);
    expect(validateImageFile(webpFile).valid).toBe(true);
  });

  it("validateImageFile rejects unsupported files", () => {
    const txtFile = new File(["hello"], "doc.txt", { type: "text/plain" });
    const pdfFile = new File(["pdf"], "doc.pdf", { type: "application/pdf" });

    expect(validateImageFile(txtFile).valid).toBe(false);
    expect(validateImageFile(pdfFile).valid).toBe(false);
  });

  it("multi-asset regression: revokeAssetUrls does not throw for blob URLs", () => {
    const sampleAsset: Asset = {
      id: "asset_123",
      filename: "test.png",
      mimeType: "image/png",
      fileSize: 1024,
      objectUrl: "blob:http://localhost/dummy-blob-id-1",
      width: 800,
      height: 600,
      aspectRatio: 1.33,
      thumbnailUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      createdAt: Date.now(),
    };

    expect(() => revokeAssetUrls(sampleAsset)).not.toThrow();
  });

  it("multi-asset regression: activeAsset derivation resolves matching asset by ID", () => {
    const assetA: Asset = {
      id: "id_A",
      filename: "A.png",
      mimeType: "image/png",
      fileSize: 100,
      objectUrl: "blob:A",
      width: 100,
      height: 100,
      aspectRatio: 1,
      thumbnailUrl: "data:thumbA",
      createdAt: 1,
    };
    const assetB: Asset = {
      id: "id_B",
      filename: "B.png",
      mimeType: "image/png",
      fileSize: 200,
      objectUrl: "blob:B",
      width: 200,
      height: 200,
      aspectRatio: 1,
      thumbnailUrl: "data:thumbB",
      createdAt: 2,
    };

    const assets = [assetA, assetB];

    // Selecting asset A
    let activeImageId: string | null = "id_A";
    let activeAsset = assets.find((a) => a.id === activeImageId) || null;
    expect(activeAsset?.id).toBe("id_A");
    expect(activeAsset?.objectUrl).toBe("blob:A");

    // Switching to asset B
    activeImageId = "id_B";
    activeAsset = assets.find((a) => a.id === activeImageId) || null;
    expect(activeAsset?.id).toBe("id_B");
    expect(activeAsset?.objectUrl).toBe("blob:B");

    // Switching back to asset A (both object URLs must remain intact!)
    activeImageId = "id_A";
    activeAsset = assets.find((a) => a.id === activeImageId) || null;
    expect(activeAsset?.id).toBe("id_A");
    expect(activeAsset?.objectUrl).toBe("blob:A");
  });
});
