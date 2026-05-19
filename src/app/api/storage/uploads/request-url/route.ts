import { NextRequest, NextResponse } from "next/server";
import { ObjectStorageService } from "@/lib/objectStorage";

const objectStorageService = new ObjectStorageService();

export async function POST(request: NextRequest) {
  try {
    const { name, size, contentType } = await request.json();
    if (typeof name !== "string" || typeof size !== "number" || size <= 0 || typeof contentType !== "string") {
      return NextResponse.json({ error: "Missing or invalid required fields: name, size, contentType" }, { status: 400 });
    }

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    return NextResponse.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error: any) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
