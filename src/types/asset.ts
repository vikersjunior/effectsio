import type { EffectId } from "../effects/types";

export interface Asset {
  id: string;                  // Unique UUID (e.g. crypto.randomUUID())
  filename: string;            // Original file name (e.g. "photo.png")
  mimeType: string;            // MIME type (image/png, image/jpeg, image/webp)
  fileSize: number;            // Size in bytes
  objectUrl: string;           // Browser Object URL (URL.createObjectURL)
  rawBlob?: Blob;              // Raw Blob binary data for IndexedDB persistence
  width: number;               // Natural pixel width
  height: number;              // Natural pixel height
  aspectRatio: number;         // Natural width / height
  thumbnailUrl: string;        // Small preview data URL or object URL
  createdAt: number;           // Unix timestamp (Date.now())
}

export interface ViewportState {
  zoom: number;                // Percentage scale (e.g. 100 = 100%, 50 = 50%)
  panX: number;                // Horizontal translation offset in CSS pixels
  panY: number;                // Vertical translation offset in CSS pixels
  fitMode: "contain" | "1:1" | "custom";
  showGrid: boolean;
  showCheckerboard: boolean;    // Fixed viewport transparency preview grid
  splitView: boolean;
  splitPosition: number;       // Normalized 0.0 (Before) to 1.0 (After), default 0.5
}

export interface EffectInstance {
  instanceId: string;          // Unique UUID for this stack entry (crypto.randomUUID())
  effectId: EffectId;          // Canonical Catalog ID (e.g. "halftone", "duotone")
  enabled: boolean;            // Visibility eye toggle (true/false)
  parameters: Record<string, unknown>; // User-configured parameters
}

export type EffectStack = EffectInstance[];

export * from "./look";

export * from "./history";
