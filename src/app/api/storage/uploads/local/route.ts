import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { processBannerImage, validateImageBuffer } from "@/lib/storage/image-processor";
import { r2StorageService } from "@/lib/storage/r2";

export async function PUT(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get("file");
    if (!fileId) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    const normalizedRelative = path.normalize(fileId).replace(/^(\.\.[\/\\])+/, "").replace(/^[\/\\]+/, "");
    const arrayBuffer = await request.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    let finalBuffer: Buffer = rawBuffer;
    const isBannerUpload = normalizedRelative.startsWith("home-banners");
    const isMobile = normalizedRelative.endsWith("mobile");

    if (isBannerUpload) {
      try {
        finalBuffer = await processBannerImage(rawBuffer, isMobile);
      } catch (procErr: any) {
        console.warn("Banner image WebP processing warning:", procErr.message);
      }
    } else {
      try {
        await validateImageBuffer(rawBuffer);
      } catch (valErr: any) {
        // proceed if unhandled file type
      }
    }

    // Try R2 storage upload if configured
    const r2Configured = Boolean(process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCOUNT_ID);
    if (r2Configured) {
      try {
        const contentType = isBannerUpload ? "image/webp" : (request.headers.get("content-type") || "image/webp");
        const r2Url = await r2StorageService.upload(normalizedRelative, finalBuffer, contentType);
        return NextResponse.json({ success: true, url: r2Url, file: normalizedRelative });
      } catch (r2Err: any) {
        console.warn("R2 storage upload failed, saving to local fallback:", r2Err.message);
      }
    }

    // Local Disk Fallback
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, normalizedRelative);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, finalBuffer);

    return NextResponse.json({ success: true, file: normalizedRelative });
  } catch (error: any) {
    console.error("Storage upload failed:", error);
    return NextResponse.json({ error: "Storage upload failed", message: error.message }, { status: 500 });
  }
}
