export type ExportFormat = "png" | "jpeg" | "webp";

export type ExportTarget = "current" | "all" | "selected";

export interface ExportOptions {
  target: ExportTarget;
  format: ExportFormat;
  quality: number; // 0.1 to 1.0 (default 0.92 for jpeg/webp, ignored for png)
  filenamePrefix?: string;
  width?: number; // Custom target export width (1 to MAX_TEXTURE_SIZE)
  height?: number; // Custom target export height (1 to MAX_TEXTURE_SIZE)
  scale?: number; // Scaling factor (e.g. 0.5, 1, 2, 4)
  time?: number; // Timeline time in seconds for animation frame evaluation (default 0)
}

export interface ExportResult {
  filename: string;
  blob: Blob;
  size: number;
  width: number;
  height: number;
}

export interface BatchExportProgress {
  current: number;
  total: number;
  currentFilename: string;
  percent: number;
}

