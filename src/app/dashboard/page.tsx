import { auth } from "@/auth";
import { getCourses } from "@/features/courses/course-actions";
import { getTeachers } from "@/features/courses/teacher-actions";
import { getSchedules } from "@/features/schedule/actions";
import { getTasks } from "@/features/tasks/actions";
import { calculateCourseGrades } from "@/lib/grades";
import DashboardManager from "@/components/dashboard/DashboardManager";

export const revalidate = 0; // Disable static rendering cache to load fresh live DB entries

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Estudiante";

  const [coursesList, teachersList, schedulesList, tasksList] = await Promise.all([
    getCourses().catch((err) => {
      console.error("Failed to load courses:", err);
      return [];
    }),
    getTeachers().catch((err) => {
      console.error("Failed to load teachers:", err);
      return [];
    }),
    getSchedules().catch((err) => {
      console.error("Failed to load schedules:", err);
      return [];
    }),
    getTasks().catch((err) => {
      console.error("Failed to load tasks:", err);
      return [];
    }),
  ]);

  // 1. Calculate Today's Classes
  const jsDay = new Date().getDay();
  const todayDrizzleDay = jsDay === 0 ? 7 : jsDay;

  // Filter schedules that match today's day of week
  const todaySchedulesFormatted = schedulesList
    .filter((s) => s.dayOfWeek === todayDrizzleDay)
    .map((s) => {
      const course = coursesList.find((c) => c.id === s.courseId);
      return {
        id: s.id,
        courseName: course?.name || "Materia",
        courseColor: course?.color || "#6366f1",
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
      };
    });

  // 2. Calculate global PPA (average of final scores)
  const coursesGrades = coursesList.map((course) => {
    const courseTasks = tasksList.filter((t) => t.courseId === course.id);
    const summary = calculateCourseGrades(course.practicesCount, courseTasks);
    return summary.finalScore;
  });

  const globalAverage =
    coursesGrades.length > 0
      ? Math.round(
          (coursesGrades.reduce((sum, score) => sum + score, 0) / coursesGrades.length) * 100
        ) / 100
      : 0;

  // 3. Calculate pending tasks count and upcoming tasks list
  const pendingTasks = tasksList.filter((t) => !t.completed);
  const pendingTasksCount = pendingTasks.length;

  const upcomingTasksFormatted = pendingTasks
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)
    .map((t) => {
      const course = coursesList.find((c) => c.id === t.courseId);
      return {
        id: t.id,
        title: t.title,
        courseName: course?.name || "Materia",
        courseColor: course?.color || "#6366f1",
        dueDate: t.dueDate.toISOString(),
      };
    });

  return (
    <DashboardManager
      userName={userName}
      coursesCount={coursesList.length}
      teachersCount={teachersList.length}
      globalAverage={globalAverage}
      pendingTasksCount={pendingTasksCount}
      todaySchedules={todaySchedulesFormatted}
      upcomingTasks={upcomingTasksFormatted}
    />
  );
}
