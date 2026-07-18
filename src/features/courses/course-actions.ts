"use server";

import { db } from "@/db";
import { courses } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CourseInput {
  name: string;
  code?: string | null;
  color: string; // hex color code
  teacherId?: string | null;
  practicesCount: number; // N configurable
}

// 1. Get all courses with their assigned teachers for the authenticated user
export async function getCourses() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    return await db.query.courses.findMany({
      where: eq(courses.userId, session.user.id),
      with: {
        teacher: true,
      },
      orderBy: (courses, { desc }) => [desc(courses.createdAt)],
    });
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    throw new Error("Failed to fetch courses");
  }
}

// 2. Create a new course
export async function createCourse(data: CourseInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!data.name.trim()) {
    throw new Error("Course name is required");
  }

  if (data.practicesCount < 0) {
    throw new Error("Practices count cannot be negative");
  }

  try {
    const [newCourse] = await db
      .insert(courses)
      .values({
        userId: session.user.id,
        name: data.name.trim(),
        code: data.code?.trim() || null,
        color: data.color,
        teacherId: data.teacherId || null,
        practicesCount: data.practicesCount,
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");
    return newCourse;
  } catch (error) {
    console.error("Failed to create course:", error);
    throw new Error("Failed to create course");
  }
}

// 3. Update an existing course
export async function updateCourse(id: string, data: CourseInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const [updatedCourse] = await db
      .update(courses)
      .set({
        name: data.name.trim(),
        code: data.code?.trim() || null,
        color: data.color,
        teacherId: data.teacherId || null,
        practicesCount: data.practicesCount,
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, id), eq(courses.userId, session.user.id)))
      .returning();

    if (!updatedCourse) {
      throw new Error("Course not found or unauthorized");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");
    return updatedCourse;
  } catch (error) {
    console.error("Failed to update course:", error);
    throw new Error("Failed to update course");
  }
}

// 4. Delete a course
export async function deleteCourse(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const [deletedCourse] = await db
      .delete(courses)
      .where(and(eq(courses.id, id), eq(courses.userId, session.user.id)))
      .returning();

    if (!deletedCourse) {
      throw new Error("Course not found or unauthorized");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");
    return deletedCourse;
  } catch (error) {
    console.error("Failed to delete course:", error);
    throw new Error("Failed to delete course");
  }
}
