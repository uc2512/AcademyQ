import { getCourses } from "@/features/courses/course-actions";
import { getMaterials } from "@/features/materials/actions";
import MaterialManager from "@/components/materials/MaterialManager";

export const revalidate = 0; // Disable static rendering cache to load live files/links

export default async function MaterialsPage() {
  const rawCourses = await getCourses();
  const rawMaterials = await getMaterials();

  // Format courses data
  const formattedCourses = rawCourses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    color: c.color,
  }));

  // Format materials data
  const formattedMaterials = rawMaterials.map((m) => ({
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    type: m.type as "link" | "file",
    url: m.url,
    fileSize: m.fileSize,
    fileType: m.fileType,
    createdAt: new Date(m.createdAt),
  }));

  return <MaterialManager courses={formattedCourses} initialMaterials={formattedMaterials} />;
}
