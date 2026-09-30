/** Client-side image compress before upload (JPEG, max edge, quality). */
export async function compressImageFile(
  file: File,
  opts?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<File> {
  const maxEdge = opts?.maxEdge ?? 1600;
  const quality = opts?.quality ?? 0.72;
  const maxBytes = opts?.maxBytes ?? 2.5 * 1024 * 1024;

  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) return file;

  let out = blob;
  if (out.size > maxBytes) {
    const tighter: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.55),
    );
    if (tighter) out = tighter;
  }

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([out], name, { type: "image/jpeg", lastModified: Date.now() });
}
