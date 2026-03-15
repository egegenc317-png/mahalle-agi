"use client";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Görsel optimize edilemedi."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function optimizeUploadImage(file: File, options?: { maxDimension?: number; quality?: number }) {
  if (!IMAGE_TYPES.has(file.type) || file.size < 900 * 1024) {
    return file;
  }

  const maxDimension = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.82;
  const image = await loadImage(file);

  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const outputType = file.type === "image/png" ? "image/jpeg" : file.type;
  const optimizedBlob = await canvasToBlob(canvas, outputType, quality);

  if (optimizedBlob.size >= file.size) {
    return file;
  }

  const nextName =
    outputType === file.type
      ? file.name
      : file.name.replace(/\.[^.]+$/, outputType === "image/jpeg" ? ".jpg" : ".webp");

  return new File([optimizedBlob], nextName, {
    type: outputType,
    lastModified: Date.now()
  });
}

export async function optimizeUploadImages(files: File[], options?: { maxDimension?: number; quality?: number }) {
  return Promise.all(files.map((file) => optimizeUploadImage(file, options)));
}
