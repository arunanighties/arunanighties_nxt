import { NextRequest, NextResponse } from "next/server";
import { ObjectStorageService, ObjectNotFoundError } from "@/lib/objectStorage";
import fs from "fs/promises";
import path from "path";

const objectStorageService = new ObjectStorageService();

type RouteParams = { params: Promise<{ splat: string[] }> };

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { splat } = await params;
  const filename = splat.join("/");

  if (process.env.PRIVATE_OBJECT_DIR) {
    try {
      const rawPath = `/objects/${filename}`;
      const file = await objectStorageService.getObjectEntityFile(rawPath);
      const response: any = await objectStorageService.downloadObject(file, 3600);
      const contentType = response.headers.get("content-type") ?? getContentType(filename);
      const arrayBuffer = await response.arrayBuffer();

      return new Response(Buffer.from(arrayBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": response.headers.get("cache-control") || "public, max-age=3600",
        },
      });
    } catch (cloudError: any) {
      if (!(cloudError instanceof ObjectNotFoundError)) {
        console.warn("Cloud storage download failed, attempting local fallback:", cloudError.message);
      }
    }
  }

  // Local storage fallback with nested directory support
  try {
    const normalizedPath = path.normalize(filename).replace(/^(\.\.[\/\\])+/, "").replace(/^[\/\\]+/, "");
    const localPath = path.join(process.cwd(), "public", "uploads", normalizedPath);
    const fileBuffer = await fs.readFile(localPath);
    const contentType = getContentType(filename);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (localError: any) {
    return NextResponse.json({ error: "Object not found" }, { status: 404 });
  }
}
