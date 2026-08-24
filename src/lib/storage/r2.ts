import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.warn(`[R2StorageService] Warning: Environment variable ${name} is missing.`);
    return "";
  }
  return val;
}

export class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
    const endpointOverride = process.env.R2_S3_ENDPOINT || "";
    
    this.bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "aruna-nighties-media";
    this.publicUrl = (process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT || "https://pub-3d4081bfb09f4b9d836da7e4edca0bf3.r2.dev").replace(/\/+$/, "");

    if (accountId && accessKeyId && secretAccessKey) {
      const endpoint = endpointOverride || `https://${accountId}.r2.cloudflarestorage.com`;
      this.client = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      throw new Error("R2StorageService is not configured. Missing R2 credentials in environment variables.");
    }
    return this.client;
  }

  /**
   * Uploads a file buffer/binary to Cloudflare R2 bucket.
   */
  async upload(key: string, body: Buffer | Uint8Array, contentType: string = "image/webp"): Promise<string> {
    const client = this.ensureClient();
    const cleanKey = key.replace(/^\/+/, "");

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return this.getPublicUrl(cleanKey);
  }

  /**
   * Deletes an object from Cloudflare R2 bucket.
   */
  async delete(key: string): Promise<void> {
    const client = this.ensureClient();
    const cleanKey = key.replace(/^\/+/, "");

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      })
    );
  }

  /**
   * Checks whether an object key exists in the bucket.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const cleanKey = key.replace(/^\/+/, "");
      await client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Constructs the public CDN URL for an object key.
   */
  getPublicUrl(key: string): string {
    if (!key) return "";
    if (key.startsWith("http://") || key.startsWith("https://")) {
      return key;
    }
    const cleanKey = key.replace(/^\/+/, "");
    if (!this.publicUrl) {
      return `/${cleanKey}`;
    }
    return `${this.publicUrl}/${cleanKey}`;
  }
}

/**
 * Standard storage object key helper
 */
export function buildProductObjectKey({
  productId,
  category,
  colorId,
  imageId,
  variant,
}: {
  productId: string | number;
  category: "featured" | "colors";
  colorId?: string;
  imageId: string;
  variant: "card" | "gallery" | "original";
}): string {
  const cleanProductId = String(productId);
  const cleanImageId = String(imageId);

  if (category === "colors" && colorId) {
    const cleanColorId = encodeURIComponent(colorId.trim().toLowerCase().replace(/\s+/g, "-"));
    return `products/${cleanProductId}/colors/${cleanColorId}/${cleanImageId}/${variant}.webp`;
  }

  return `products/${cleanProductId}/featured/${cleanImageId}/${variant}.webp`;
}

/**
 * Standard home banner storage object key helper: home-banners/banner-id/desktop or mobile
 */
export function buildHomeBannerObjectKey({
  bannerId,
  variant,
}: {
  bannerId: string | number;
  variant: "desktop" | "mobile";
}): string {
  const cleanBannerId = String(bannerId).trim();
  return `home-banners/${cleanBannerId}/${variant}`;
}

export const r2StorageService = new R2StorageService();

