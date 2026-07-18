import { getTeachers } from "@/features/courses/teacher-actions";
import TeacherList from "@/components/teachers/TeacherList";

export const revalidate = 0; // Disable static rendering cache to get fresh DB data

export default async function TeachersPage() {
  const teachersList = await getTeachers();

  // Map database entity to UI expected structure (handle potential nulls nicely)
  const formattedTeachers = teachersList.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    office: t.office,
    phone: t.phone,
    photo: t.photo,
  }));

  return <TeacherList initialTeachers={formattedTeachers} />;
}
