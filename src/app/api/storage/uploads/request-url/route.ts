import { NextRequest, NextResponse } from "next/server";
import { ObjectStorageService } from "@/lib/objectStorage";
import { randomUUID } from "crypto";

const objectStorageService = new ObjectStorageService();

export async function POST(request: NextRequest) {
  try {
    const { name, size, contentType, customPath } = await request.json();
    if (typeof name !== "string" || typeof size !== "number" || size <= 0 || typeof contentType !== "string") {
      return NextResponse.json({ error: "Missing or invalid required fields: name, size, contentType" }, { status: 400 });
    }

    // Storage Path (structured path if customPath given, otherwise UUID filename)
    let fileId: string;
    if (typeof customPath === "string" && customPath.trim().length > 0) {
      fileId = customPath.trim().replace(/^\/?(objects\/)?/, "");
    } else {
      fileId = `${randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    }

    const r2PublicUrl = (process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT || "https://pub-3d4081bfb09f4b9d836da7e4edca0bf3.r2.dev").replace(/\/+$/, "");
    const r2DirectUrl = `${r2PublicUrl}/${fileId}`;

    const origin = request.nextUrl.origin;
    const uploadURL = `${origin}/api/storage/uploads/local?file=${encodeURIComponent(fileId)}`;

    return NextResponse.json({
      uploadURL,
      objectPath: r2DirectUrl,
      url: r2DirectUrl,
      metadata: { name, size, contentType }
    });
  } catch (error: any) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL", message: error.message }, { status: 500 });
  }
}
