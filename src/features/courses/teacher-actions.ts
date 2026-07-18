"use server";

import { db } from "@/db";
import { teachers } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface TeacherInput {
  name: string;
  email?: string | null;
  office?: string | null;
  phone?: string | null;
  photo?: string | null;
}

// 1. Get all teachers for the authenticated user
export async function getTeachers() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    return await db.query.teachers.findMany({
      where: eq(teachers.userId, session.user.id),
      orderBy: (teachers, { desc }) => [desc(teachers.createdAt)],
    });
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    throw new Error("Failed to fetch teachers");
  }
}

// 2. Create a new teacher
export async function createTeacher(data: TeacherInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!data.name.trim()) {
    throw new Error("Teacher name is required");
  }

  try {
    const [newTeacher] = await db
      .insert(teachers)
      .values({
        userId: session.user.id,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        office: data.office?.trim() || null,
        phone: data.phone?.trim() || null,
        photo: data.photo || null,
      })
      .returning();

    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/courses");
    return newTeacher;
  } catch (error) {
    console.error("Failed to create teacher:", error);
    throw new Error("Failed to create teacher");
  }
}

// 3. Update an existing teacher
export async function updateTeacher(id: string, data: TeacherInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const [updatedTeacher] = await db
      .update(teachers)
      .set({
        name: data.name.trim(),
        email: data.email?.trim() || null,
        office: data.office?.trim() || null,
        phone: data.phone?.trim() || null,
        photo: data.photo || null,
        updatedAt: new Date(),
      })
      .where(and(eq(teachers.id, id), eq(teachers.userId, session.user.id)))
      .returning();

    if (!updatedTeacher) {
      throw new Error("Teacher not found or unauthorized");
    }

    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/courses");
    return updatedTeacher;
  } catch (error) {
    console.error("Failed to update teacher:", error);
    throw new Error("Failed to update teacher");
  }
}

// 4. Delete a teacher
export async function deleteTeacher(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const [deletedTeacher] = await db
      .delete(teachers)
      .where(and(eq(teachers.id, id), eq(teachers.userId, session.user.id)))
      .returning();

    if (!deletedTeacher) {
      throw new Error("Teacher not found or unauthorized");
    }

    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/courses");
    return deletedTeacher;
  } catch (error) {
    console.error("Failed to delete teacher:", error);
    throw new Error("Failed to delete teacher");
  }
}
