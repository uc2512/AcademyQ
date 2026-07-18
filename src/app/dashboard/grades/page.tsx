import { getCourses } from "@/features/courses/course-actions";
import { getTasks } from "@/features/tasks/actions";
import GradeManager from "@/components/grades/GradeManager";

export const revalidate = 0; // Disable static rendering cache to get fresh DB data

export default async function GradesPage() {
  const rawCourses = await getCourses();
  const rawTasks = await getTasks();

  // Format courses data
  const formattedCourses = rawCourses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    color: c.color,
    practicesCount: c.practicesCount,
  }));

  // Format tasks data containing grades
  const formattedTasks = rawTasks.map((t) => ({
    id: t.id,
    courseId: t.courseId,
    type: t.type,
    practiceNumber: t.practiceNumber,
    grade: t.grade,
  }));

  return <GradeManager courses={formattedCourses} initialTasks={formattedTasks} />;
}
