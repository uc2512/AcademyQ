"use client";

import { useState, useTransition } from "react";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  CourseInput,
} from "@/features/courses/course-actions";
import styles from "./courses.module.css";
import Portal from "@/components/ui/Portal";

interface Teacher {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
  practicesCount: number;
  teacherId: string | null;
  teacher: Teacher | null;
}

interface CourseListProps {
  initialCourses: Course[];
  teachers: Teacher[];
}

const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
];

export default function CourseList({ initialCourses, teachers }: CourseListProps) {
  const [coursesList, setCoursesList] = useState<Course[]>(initialCourses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [teacherId, setTeacherId] = useState("");
  const [practicesCount, setPracticesCount] = useState(5);

  const resetForm = () => {
    setName("");
    setCode("");
    setColor(COLOR_PRESETS[0]);
    setTeacherId("");
    setPracticesCount(5);
    setEditingCourse(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setCode(course.code || "");
    setColor(course.color);
    setTeacherId(course.teacherId || "");
    setPracticesCount(course.practicesCount);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const inputData: CourseInput = {
      name: name.trim(),
      code: code.trim() || null,
      color,
      teacherId: teacherId || null,
      practicesCount: Number(practicesCount),
    };

    startTransition(async () => {
      try {
        if (editingCourse) {
          const updated = await updateCourse(editingCourse.id, inputData);

          // Re-map relationship manually or match with the list of teachers locally
          const selectedTeacher = teachers.find((t) => t.id === teacherId) || null;
          const formattedUpdated: Course = {
            ...(updated as any),
            teacher: selectedTeacher,
          };

          setCoursesList((prev) =>
            prev.map((c) => (c.id === editingCourse.id ? formattedUpdated : c))
          );
        } else {
          const created = await createCourse(inputData);

          const selectedTeacher = teachers.find((t) => t.id === teacherId) || null;
          const formattedCreated: Course = {
            ...(created as any),
            teacher: selectedTeacher,
          };

          setCoursesList((prev) => [formattedCreated, ...prev]);
        }
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al procesar la materia");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar esta materia? Se borrarán permanentemente sus configuraciones."
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCourse(id);
        setCoursesList((prev) => prev.filter((c) => c.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar");
      }
    });
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Materias</h1>
          <p className={styles.subtitle}>
            Gestiona tus asignaturas y define el número de prácticas a evaluar.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Materia
        </button>
      </div>

      {coursesList.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            viewBox="0 0 24 24"
            width="48"
            height="48"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              No hay materias registradas
            </h3>
            <p style={{ fontSize: "0.875rem" }}>
              Crea tus materias para organizar tus horarios, tareas y calificaciones.
            </p>
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            Agregar primera materia
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {coursesList.map((course) => (
            <div
              key={course.id}
              className={`${styles.card} glassmorphism`}
              style={{ borderLeftColor: course.color }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.courseCode}>{course.code || "Sin código"}</span>
                <h3 className={styles.courseName}>{course.name}</h3>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.teacherBadge}>
                  <svg
                    className={styles.teacherIcon}
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{course.teacher?.name || "Sin docente asignado"}</span>
                </div>
                <div className={styles.practicesBadge}>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>{course.practicesCount} Prácticas configuradas</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button
                  onClick={() => openEditModal(course)}
                  className={styles.iconBtn}
                  title="Editar materia"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  title="Eliminar materia"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <Portal>
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editingCourse ? "Editar Materia" : "Nueva Materia"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className={styles.iconBtn}>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre de la Materia *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Cálculo I"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código de Asignatura</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. MAT-101"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Número de Prácticas a Evaluar (N) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="30"
                    value={practicesCount}
                    onChange={(e) => setPracticesCount(Number(e.target.value))}
                    placeholder="Ej. 5"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Docente Asignado</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    disabled={isPending}
                  >
                    <option value="">-- Sin docente --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <span className={styles.colorPickerLabel}>Color Temático (Calendario / UI)</span>
                  <div className={styles.colorContainer}>
                    {COLOR_PRESETS.map((pColor) => (
                      <button
                        key={pColor}
                        type="button"
                        onClick={() => setColor(pColor)}
                        className={`${styles.colorBubble} ${
                          color === pColor ? styles.colorBubbleSelected : ""
                        }`}
                        style={{ backgroundColor: pColor }}
                        aria-label={`Color ${pColor}`}
                        disabled={isPending}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={isPending}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending
                      ? "Guardando..."
                      : editingCourse
                        ? "Guardar Cambios"
                        : "Crear Materia"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
