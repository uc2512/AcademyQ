import { getTasks } from "@/features/tasks/actions";
import { getCourses } from "@/features/courses/course-actions";
import { getSchedules } from "@/features/schedule/actions";
import TaskManager from "@/components/tasks/TaskManager";

export const revalidate = 0; // Disable static rendering cache to get fresh DB data

export default async function TasksPage() {
  const rawTasks = await getTasks();
  const rawCourses = await getCourses();
  const rawSchedules = await getSchedules();

  // Format data for safety and matching types
  const formattedTasks = rawTasks.map((t) => ({
    id: t.id,
    courseId: t.courseId,
    title: t.title,
    description: t.description,
    dueDate: new Date(t.dueDate),
    type: t.type,
    practiceNumber: t.practiceNumber,
    completed: t.completed,
    course: {
      id: t.course.id,
      name: t.course.name,
      code: t.course.code,
      color: t.course.color,
    },
  }));

  const formattedCourses = rawCourses.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    practicesCount: c.practicesCount,
  }));

  const formattedSchedules = rawSchedules.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    course: {
      name: s.course.name,
      color: s.course.color,
    },
  }));

  return (
    <TaskManager
      initialTasks={formattedTasks}
      courses={formattedCourses}
      schedules={formattedSchedules}
    />
  );
}
