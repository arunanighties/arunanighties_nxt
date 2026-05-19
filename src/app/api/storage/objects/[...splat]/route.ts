import { NextRequest, NextResponse } from "next/server";
import { ObjectStorageService, ObjectNotFoundError } from "@/lib/objectStorage";

const objectStorageService = new ObjectStorageService();

type RouteParams = { params: Promise<{ splat: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { splat } = await params;
    const rawPath = `/objects/${splat.join("/")}`;
    const file = await objectStorageService.getObjectEntityFile(rawPath);
    const response: any = await objectStorageService.downloadObject(file, 3600);
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();

    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": response.headers.get("cache-control") || "private, max-age=3600"
      }
    });
  } catch (error: any) {
    if (error instanceof ObjectNotFoundError) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 });
    }
    console.error("Error serving object:", error);
    return NextResponse.json({ error: "Failed to serve object" }, { status: 500 });
  }
}
