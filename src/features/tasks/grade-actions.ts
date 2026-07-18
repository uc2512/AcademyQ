"use server";

import { db } from "@/db";
import { tasks, courses } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. Update the grade of an existing task by its ID
export async function updateTaskGrade(id: string, grade: number | null) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (grade !== null && (grade < 0 || grade > 100)) {
    throw new Error("La nota debe estar entre 0 y 100 puntos");
  }

  try {
    // Verify course ownership via relation
    const taskMatch = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        course: true,
      },
    });

    if (!taskMatch || taskMatch.course.userId !== session.user.id) {
      throw new Error("Entregable no encontrado o no autorizado");
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        grade: grade,
        completed: grade !== null ? true : taskMatch.completed, // Auto-mark completed if graded
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/grades");
    revalidatePath("/dashboard/tasks");
    return updatedTask;
  } catch (error) {
    console.error("Failed to update task grade:", error);
    throw error;
  }
}

// 2. Direct grade upsert: updates or inserts an implicit task to assign a grade
export async function upsertTaskGradeDirectly(
  courseId: string,
  type: string,
  practiceNumber: number | null,
  grade: number | null
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (grade !== null && (grade < 0 || grade > 100)) {
    throw new Error("La nota debe estar entre 0 y 100 puntos");
  }

  try {
    // 1. Verify course ownership
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Curso no encontrado o no autorizado");
    }

    // 2. Search if there is already a task of this type (and practice number)
    const existingTask = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.courseId, courseId),
        eq(tasks.type, type),
        type === "practice" && practiceNumber ? eq(tasks.practiceNumber, practiceNumber) : undefined
      ),
    });

    if (existingTask) {
      // Update existing
      const [updated] = await db
        .update(tasks)
        .set({
          grade: grade,
          completed: grade !== null ? true : existingTask.completed,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, existingTask.id))
        .returning();

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/grades");
      revalidatePath("/dashboard/tasks");
      return updated;
    } else {
      // If we are setting a grade to null and the task doesn't exist, we don't need to create it
      if (grade === null) return null;

      // Create an implicit placeholder task
      let title = "";
      if (type === "exam_1") title = "Examen Parcial 1";
      else if (type === "exam_2") title = "Examen Parcial 2";
      else if (type === "exam_final") title = "Examen Final";
      else if (type === "practice") title = `Práctica #${practiceNumber}`;
      else title = `Entregable ${type}`;

      const [created] = await db
        .insert(tasks)
        .values({
          courseId,
          title,
          type,
          practiceNumber: type === "practice" ? practiceNumber : null,
          dueDate: new Date(), // Set to now as it's a graded record
          grade,
          completed: true,
        })
        .returning();

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/grades");
      revalidatePath("/dashboard/tasks");
      return created;
    }
  } catch (error) {
    console.error("Failed to upsert task grade:", error);
    throw error;
  }
}
