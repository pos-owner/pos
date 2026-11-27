import { api } from "./api";
import { compressImage } from "./image";

export interface Uploaded {
  key: string;
  url: string;
}

/** Shrinks a camera photo, then stores it privately. Returns its key and a signed URL. */
export async function uploadPhoto(file: File): Promise<Uploaded> {
  const blob = await compressImage(file);
  const type = blob.type || file.type || "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const form = new FormData();
  form.append("file", blob instanceof File ? blob : new File([blob], `photo.${ext}`, { type }));
  return api<Uploaded>("/api/photos", { form });
}
