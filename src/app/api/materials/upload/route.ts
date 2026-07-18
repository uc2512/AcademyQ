import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name;
    const blob = await file.arrayBuffer();

    // Hybrid logic: Use Vercel Blob if token is set, otherwise fall back to local disk storage
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobResult = await put(filename, blob, {
        access: "public",
      });
      return NextResponse.json({
        url: blobResult.url,
        size: file.size,
        type: file.type,
      });
    } else {
      // Mock local upload directory (under public/uploads)
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeName);
      fs.writeFileSync(filePath, Buffer.from(blob));

      return NextResponse.json({
        url: `/uploads/${safeName}`,
        size: file.size,
        type: file.type,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
