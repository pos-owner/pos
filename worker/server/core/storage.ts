import { bindings } from "./bindings.ts";

/*
 * Photos live in a private R2 bucket (binding PHOTOS). Browsers never get bucket access: they load photos through
 * short-lived HMAC-signed API links (`/api/photos/:key`), which the Worker serves from R2 with edge caching.
 */

export const typeOf = (key: string) =>
  key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";

export async function putPhoto(key: string, bytes: ArrayBuffer, meta: Record<string, string> = {}): Promise<void> {
  await bindings().PHOTOS.put(key, bytes, {
    httpMetadata: { contentType: typeOf(key), cacheControl: "private, max-age=3600" },
    customMetadata: meta,
  });
}

export async function getPhoto(key: string): Promise<ArrayBuffer | null> {
  const obj = await bindings().PHOTOS.get(key);
  return obj ? obj.arrayBuffer() : null;
}

export async function deletePhoto(key: string): Promise<void> {
  await bindings().PHOTOS.delete(key);
}
