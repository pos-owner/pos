/**
 * Photos are stored in the database (no file bucket), so they must stay small. Each step is tried in turn until the
 * JPEG fits under TARGET_BYTES; the server accepts up to 1.2 MB (MAX_PHOTO_BYTES in worker/server/core/storage.ts).
 */
const TARGET_BYTES = 900_000;
const STEPS: [max: number, quality: number][] = [
  [1600, 0.8],
  [1280, 0.7],
  [1024, 0.6],
  [800, 0.55],
];

/** Shrinks camera photos before upload (JPEG, under ~900 KB) to save data, memory and database space. */
export async function compressImage(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    let best: Blob | null = null;
    for (const [limit, quality] of STEPS) {
      const scale = Math.min(1, Math.min(max, limit) / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale),
        h = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && (!best || blob.size < best.size)) best = blob;
      if (blob && blob.size <= TARGET_BYTES) break;
    }
    bmp.close();
    return best ?? file;
  } catch {
    return file;
  }
}
