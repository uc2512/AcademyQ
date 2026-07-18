import { getSchedules } from "@/features/schedule/actions";
import { getCourses } from "@/features/courses/course-actions";
import ScheduleManager from "@/components/schedule/ScheduleManager";

export const revalidate = 0; // Fresh database content on each page request

export default async function SchedulePage() {
  const rawSchedules = await getSchedules();
  const rawCourses = await getCourses();

  // Format data for component safety
  const formattedSchedules = rawSchedules.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    classroom: s.classroom,
    course: {
      id: s.course.id,
      name: s.course.name,
      code: s.course.code,
      color: s.course.color,
    },
  }));

  const formattedCourses = rawCourses.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  return <ScheduleManager initialSchedules={formattedSchedules} courses={formattedCourses} />;
}
