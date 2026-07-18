import { getCourses } from "@/features/courses/course-actions";
import { getTeachers } from "@/features/courses/teacher-actions";
import CourseList from "@/components/courses/CourseList";

export const revalidate = 0; // Disable static rendering cache to get fresh DB data

export default async function CoursesPage() {
  const coursesList = await getCourses();
  const teachersList = await getTeachers();

  // Format courses data to match component expectations
  const formattedCourses = coursesList.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    color: c.color,
    practicesCount: c.practicesCount,
    teacherId: c.teacherId,
    teacher: c.teacher
      ? {
          id: c.teacher.id,
          name: c.teacher.name,
        }
      : null,
  }));

  // Format teachers to populate the options dropdown
  const formattedTeachers = teachersList.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return <CourseList initialCourses={formattedCourses} teachers={formattedTeachers} />;
}
