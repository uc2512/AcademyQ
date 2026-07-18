"use server";

import { db } from "@/db";
import { tasks, courses } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface TaskInput {
  courseId: string;
  title: string;
  description?: string | null;
  dueDate: Date;
  type: string; // 'homework', 'project', 'exam_1', 'exam_2', 'exam_final', 'practice'
  practiceNumber?: number | null;
}

// 1. Get all tasks for the authenticated user, joined with course info
export async function getTasks() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const userCourses = await db.query.courses.findMany({
      where: eq(courses.userId, session.user.id),
      with: {
        tasks: true,
      },
    });

    const allTasks = userCourses.flatMap((course) =>
      course.tasks.map((task) => ({
        ...task,
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          color: course.color,
          practicesCount: course.practicesCount,
        },
      }))
    );

    // Sort by due date (closest first)
    return allTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    throw new Error("Failed to fetch tasks");
  }
}

// 2. Create a new task
export async function createTask(data: TaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!data.title.trim()) {
    throw new Error("El título de la tarea es obligatorio");
  }

  try {
    // Verify course ownership
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, data.courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Curso no encontrado o no autorizado");
    }

    // Additional check for practice number limit
    if (data.type === "practice" && data.practiceNumber) {
      if (data.practiceNumber < 1 || data.practiceNumber > courseMatch.practicesCount) {
        throw new Error(
          `Número de práctica inválido. Esta materia solo tiene ${courseMatch.practicesCount} prácticas configuradas.`
        );
      }
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        courseId: data.courseId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dueDate: data.dueDate,
        type: data.type,
        practiceNumber: data.type === "practice" ? data.practiceNumber || null : null,
        completed: false,
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tasks");
    return newTask;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

// 3. Update an existing task
export async function updateTask(id: string, data: TaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify course ownership
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, data.courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Curso no encontrado o no autorizado");
    }

    if (data.type === "practice" && data.practiceNumber) {
      if (data.practiceNumber < 1 || data.practiceNumber > courseMatch.practicesCount) {
        throw new Error(
          `Número de práctica inválido. Esta materia solo tiene ${courseMatch.practicesCount} prácticas configuradas.`
        );
      }
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        courseId: data.courseId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dueDate: data.dueDate,
        type: data.type,
        practiceNumber: data.type === "practice" ? data.practiceNumber || null : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tasks");
    return updatedTask;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

// 4. Delete a task
export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const taskMatch = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        course: true,
      },
    });

    if (!taskMatch || taskMatch.course.userId !== session.user.id) {
      throw new Error("Tarea no encontrada o no autorizada");
    }

    const [deletedTask] = await db.delete(tasks).where(eq(tasks.id, id)).returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tasks");
    return deletedTask;
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

// 5. Toggle task completion status
export async function toggleTaskCompletion(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const taskMatch = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        course: true,
      },
    });

    if (!taskMatch || taskMatch.course.userId !== session.user.id) {
      throw new Error("Tarea no encontrada o no autorizada");
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        completed: !taskMatch.completed,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tasks");
    return updatedTask;
  } catch (error) {
    console.error("Failed to toggle task:", error);
    throw error;
  }
}
