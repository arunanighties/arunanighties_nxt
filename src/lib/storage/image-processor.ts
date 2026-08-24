import sharp, { type Metadata } from "sharp";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class ImageValidationError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

export interface ProcessedImageVariants {
  card: Buffer;
  gallery: Buffer;
  original: Buffer;
}

/**
 * Validates file buffer size, format magic bytes, dimensions, and Sharp decoding.
 */
export async function validateImageBuffer(buffer: Buffer, declaredContentType?: string): Promise<Metadata> {
  if (!buffer || buffer.length === 0) {
    throw new ImageValidationError("Image file is empty", "INVALID_IMAGE");
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageValidationError(
      `Image file size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB`,
      "FILE_TOO_LARGE"
    );
  }

  // Inspect header magic bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x48 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    throw new ImageValidationError(
      "Unsupported image format. Only JPEG, PNG, and WebP images are allowed.",
      "UNSUPPORTED_FORMAT"
    );
  }

  try {
    const instance = sharp(buffer);
    const metadata = await instance.metadata();

    if (!metadata || !metadata.format || !metadata.width || !metadata.height) {
      throw new ImageValidationError("Failed to decode image dimensions", "CORRUPTED_IMAGE");
    }

    const allowedFormats = ["jpeg", "jpg", "png", "webp"];
    if (!allowedFormats.includes(metadata.format)) {
      throw new ImageValidationError(
        `Image format '${metadata.format}' is not supported. Use JPEG, PNG, or WebP.`,
        "UNSUPPORTED_FORMAT"
      );
    }

    return metadata;
  } catch (err: any) {
    if (err instanceof ImageValidationError) throw err;
    throw new ImageValidationError(
      "Corrupted or unreadable image file",
      "CORRUPTED_IMAGE"
    );
  }
}

/**
 * Processes an incoming validated image buffer into WebP variants (card, gallery, original).
 */
export async function processImageVariants(buffer: Buffer): Promise<ProcessedImageVariants> {
  await validateImageBuffer(buffer);

  const cardBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 500,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  const galleryBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 1400,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const originalBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 2000,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 90, effort: 4 })
    .toBuffer();

  return {
    card: cardBuffer,
    gallery: galleryBuffer,
    original: originalBuffer,
  };
}

/**
 * Processes a home banner image buffer into WebP format.
 * Desktop: resized up to 1920px width.
 * Mobile: resized up to 1080px width.
 */
export async function processBannerImage(buffer: Buffer, isMobile: boolean = false): Promise<Buffer> {
  await validateImageBuffer(buffer);
  const maxWidth = isMobile ? 1080 : 1920;
  return await sharp(buffer)
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
}
