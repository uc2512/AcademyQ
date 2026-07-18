import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic"; // Force dynamic execution to prevent Vercel environment caching

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    const filename = file.name;
    const blob = await file.arrayBuffer();

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

    // Diagnostic key output for verification (only returning keys, never secret values)
    const envKeys = Object.keys(process.env).filter(
      (k) =>
        k.includes("BLOB") || k.includes("TOKEN") || k.includes("AUTH") || k.includes("DATABASE")
    );

    // 1. If we are in production but there is no Blob Token, we cannot use Vercel Blob
    if (isProduction && !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: `Error de Configuración: Vercel Blob no está activo. Variables de entorno detectadas: [${envKeys.join(
            ", "
          )}]. Por favor, asegúrate de que BLOB_READ_WRITE_TOKEN esté listado en Settings > Environment Variables en Vercel y haz un Redeploy.`,
        },
        { status: 500 }
      );
    }

    // 2. Try to upload to Vercel Blob if token is set
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobResult = await put(filename, blob, {
          access: "public",
        });
        return NextResponse.json({
          url: blobResult.url,
          size: file.size,
          type: file.type,
        });
      } catch (blobError) {
        console.error("Vercel Blob upload failed:", blobError);
        return NextResponse.json(
          {
            error: `Fallo al subir a Vercel Blob: ${
              blobError instanceof Error ? blobError.message : String(blobError)
            }. Variables: [${envKeys.join(", ")}]`,
          },
          { status: 500 }
        );
      }
    } else {
      // Development Local Mock
      try {
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
      } catch (localError) {
        console.error("Local mock upload failed:", localError);
        return NextResponse.json(
          {
            error: `Fallo al escribir archivo local en desarrollo: ${
              localError instanceof Error ? localError.message : String(localError)
            }`,
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("General upload error:", error);
    return NextResponse.json(
      {
        error: `Fallo general en la subida: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
