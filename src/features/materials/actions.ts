"use server";

import { db } from "@/db";
import { materials, courses } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

export interface MaterialInput {
  courseId: string;
  title: string;
  type: "link" | "file";
  url: string;
  fileSize?: number;
  fileType?: string;
}

// 1. Get all materials for courses owned by the authenticated user
export async function getMaterials() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const userCourses = await db.query.courses.findMany({
      where: eq(courses.userId, session.user.id),
      with: {
        materials: true,
      },
    });

    // Flatten all materials
    const allMaterials = userCourses.flatMap((course) =>
      course.materials.map((m) => ({
        ...m,
        courseName: course.name,
        courseColor: course.color,
      }))
    );

    // Sort by creation date descending
    return allMaterials.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    throw error;
  }
}

// 2. Create study resource (Link or File upload metadata)
export async function createMaterial(input: MaterialInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify course ownership
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, input.courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Materia no encontrada o no autorizada");
    }

    const [newMaterial] = await db
      .insert(materials)
      .values({
        courseId: input.courseId,
        title: input.title,
        type: input.type,
        url: input.url,
        fileSize: input.fileSize || null,
        fileType: input.fileType || null,
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/materials");
    return newMaterial;
  } catch (error) {
    console.error("Failed to create material:", error);
    throw error;
  }
}

// 3. Delete material and clean up binary storage (Vercel Blob or local disk fallback)
export async function deleteMaterial(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // 1. Fetch material info to verify authorization and file details using a flat inner join
    const result = await db
      .select({
        id: materials.id,
        type: materials.type,
        url: materials.url,
        courseUserId: courses.userId,
      })
      .from(materials)
      .innerJoin(courses, eq(materials.courseId, courses.id))
      .where(eq(materials.id, id))
      .limit(1);

    const materialMatch = result[0];

    if (!materialMatch || materialMatch.courseUserId !== session.user.id) {
      throw new Error("Recurso no encontrado o no autorizado");
    }

    // 2. Delete binary from storage if it is a file
    if (materialMatch.type === "file" && materialMatch.url) {
      const isVercelBlob = materialMatch.url.includes("vercel-storage.com");
      if (isVercelBlob && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          await del(materialMatch.url);
        } catch (err) {
          console.warn("Failed to delete from Vercel Blob, continuing:", err);
        }
      } else if (materialMatch.url.startsWith("/uploads/")) {
        // Local fallback clean up
        const localPath = path.join(process.cwd(), "public", materialMatch.url);
        if (fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath);
          } catch (err) {
            console.warn("Failed to delete local file, continuing:", err);
          }
        }
      }
    }

    // 3. Delete from database
    await db.delete(materials).where(eq(materials.id, id));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/materials");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete material:", error);
    throw error;
  }
}
