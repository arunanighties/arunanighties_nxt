import { NextRequest, NextResponse } from "next/server";
import { ObjectStorageService } from "@/lib/objectStorage";

const objectStorageService = new ObjectStorageService();

type RouteParams = { params: Promise<{ splat: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { splat } = await params;
    const filePath = splat.join("/");
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 });
    }
    const response: any = await objectStorageService.downloadObject(file);
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    
    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": response.headers.get("cache-control") || "public, max-age=3600"
      }
    });
  } catch (error: any) {
    console.error("Error serving public object:", error);
    return NextResponse.json({ error: "Failed to serve object" }, { status: 500 });
  }
}
