"use server";

import { db } from "@/db";
import { schedules, courses } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ScheduleInput {
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom?: string | null;
}

// Helper to convert "HH:MM" to minutes for easier range comparisons
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// 1. Get all schedules for the authenticated user, joined with courses details
export async function getSchedules() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // We fetch courses first or do a join using relations
    const userCourses = await db.query.courses.findMany({
      where: eq(courses.userId, session.user.id),
      with: {
        schedules: true,
      },
    });

    // Flatten and format schedules, attaching course metadata
    const allSchedules = userCourses.flatMap((course) =>
      course.schedules.map((sched) => ({
        ...sched,
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          color: course.color,
        },
      }))
    );

    // Sort by day and start time
    return allSchedules.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    throw new Error("Failed to fetch schedules");
  }
}

// 2. Create a new schedule block with overlap detection
export async function createSchedule(data: ScheduleInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const startMin = timeToMinutes(data.startTime);
  const endMin = timeToMinutes(data.endTime);

  if (startMin >= endMin) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin");
  }

  try {
    // 1. Verify the course belongs to the authenticated user
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, data.courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Curso no encontrado o no autorizado");
    }

    // 2. Fetch all existing schedules of the user for that specific day to check overlap
    const existingUserSchedules = await getSchedules();
    const dayConflicts = existingUserSchedules.filter((s) => s.dayOfWeek === data.dayOfWeek);

    for (const conflict of dayConflicts) {
      const existingStart = timeToMinutes(conflict.startTime);
      const existingEnd = timeToMinutes(conflict.endTime);

      // Overlap formula: (StartA < EndB) && (EndA > StartB)
      if (startMin < existingEnd && endMin > existingStart) {
        throw new Error(
          `¡Conflicto de Horario! Se cruza con "${conflict.course.name}" (${conflict.startTime} - ${conflict.endTime})`
        );
      }
    }

    // 3. Insert schedule
    const [newSchedule] = await db
      .insert(schedules)
      .values({
        courseId: data.courseId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: data.classroom?.trim() || null,
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    return newSchedule;
  } catch (error) {
    console.error("Failed to create schedule:", error);
    throw error;
  }
}

// 3. Update an existing schedule block
export async function updateSchedule(id: string, data: ScheduleInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const startMin = timeToMinutes(data.startTime);
  const endMin = timeToMinutes(data.endTime);

  if (startMin >= endMin) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin");
  }

  try {
    // 1. Verify course ownership
    const courseMatch = await db.query.courses.findFirst({
      where: and(eq(courses.id, data.courseId), eq(courses.userId, session.user.id)),
    });

    if (!courseMatch) {
      throw new Error("Curso no encontrado o no autorizado");
    }

    // 2. Check overlap excluding this schedule block
    const existingUserSchedules = await getSchedules();
    const dayConflicts = existingUserSchedules.filter(
      (s) => s.dayOfWeek === data.dayOfWeek && s.id !== id
    );

    for (const conflict of dayConflicts) {
      const existingStart = timeToMinutes(conflict.startTime);
      const existingEnd = timeToMinutes(conflict.endTime);

      if (startMin < existingEnd && endMin > existingStart) {
        throw new Error(
          `¡Conflicto de Horario! Se cruza con "${conflict.course.name}" (${conflict.startTime} - ${conflict.endTime})`
        );
      }
    }

    // 3. Update database
    const [updatedSchedule] = await db
      .update(schedules)
      .set({
        courseId: data.courseId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: data.classroom?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    return updatedSchedule;
  } catch (error) {
    console.error("Failed to update schedule:", error);
    throw error;
  }
}

// 4. Delete a schedule block
export async function deleteSchedule(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Ensure the schedule belongs to one of the user's courses
    const scheduleMatch = await db.query.schedules.findFirst({
      where: eq(schedules.id, id),
      with: {
        course: true,
      },
    });

    if (!scheduleMatch || scheduleMatch.course.userId !== session.user.id) {
      throw new Error("Horario no encontrado o no autorizado");
    }

    const [deletedSchedule] = await db.delete(schedules).where(eq(schedules.id, id)).returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    return deletedSchedule;
  } catch (error) {
    console.error("Failed to delete schedule:", error);
    throw error;
  }
}
