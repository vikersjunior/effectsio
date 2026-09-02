import type { ExportFormat } from "../types/export";

export function getMimeTypeForFormat(format: ExportFormat): string {
  switch (format) {
    case "png":
      return "image/png";
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

export function getFileExtensionForFormat(format: ExportFormat): string {
  switch (format) {
    case "png":
      return ".png";
    case "jpeg":
      return ".jpg";
    case "webp":
      return ".webp";
    default:
      return ".png";
  }
}

export function sanitizeFilename(name: string): string {
  if (!name) return "export";

  // Remove unsafe filesystem characters and control codes
  const sanitized = name
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .trim();

  return sanitized || "export";
}

export function getBaseFilenameWithoutExtension(filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const lastDotIndex = sanitized.lastIndexOf(".");
  if (lastDotIndex <= 0) return sanitized;
  return sanitized.slice(0, lastDotIndex);
}

export function buildExportFilename(
  originalFilename: string,
  format: ExportFormat,
  suffix = "-effectsio"
): string {
  const baseName = getBaseFilenameWithoutExtension(originalFilename);
  const ext = getFileExtensionForFormat(format);
  return `${baseName}${suffix}${ext}`;
}

export function disambiguateFilenames(filenames: string[]): string[] {
  const seenCount = new Map<string, number>();
  const result: string[] = [];

  for (const filename of filenames) {
    const lastDotIndex = filename.lastIndexOf(".");
    const base = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
    const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : "";

    const count = seenCount.get(filename) || 0;
    seenCount.set(filename, count + 1);

    if (count === 0) {
      result.push(filename);
    } else {
      result.push(`${base}-${count + 1}${ext}`);
    }
  }

  return result;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
