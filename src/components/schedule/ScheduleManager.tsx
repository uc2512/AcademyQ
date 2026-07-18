"use client";

import { useState, useTransition } from "react";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  ScheduleInput,
} from "@/features/schedule/actions";
import styles from "./schedule.module.css";
import Portal from "@/components/ui/Portal";

interface Course {
  id: string;
  name: string;
  color: string;
}

interface ScheduleBlock {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  course: {
    id: string;
    name: string;
    code: string | null;
    color: string;
  };
}

interface ScheduleManagerProps {
  initialSchedules: ScheduleBlock[];
  courses: Course[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export default function ScheduleManager({ initialSchedules, courses }: ScheduleManagerProps) {
  const [schedulesList, setSchedulesList] = useState<ScheduleBlock[]>(initialSchedules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [courseId, setCourseId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [classroom, setClassroom] = useState("");

  const resetForm = () => {
    setCourseId(courses[0]?.id || "");
    setDayOfWeek(1);
    setStartTime("08:00");
    setEndTime("09:30");
    setClassroom("");
    setEditingBlock(null);
  };

  const openAddModal = (initialDay?: number) => {
    resetForm();
    if (initialDay) setDayOfWeek(initialDay);
    setIsModalOpen(true);
  };

  const openEditModal = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setCourseId(block.courseId);
    setDayOfWeek(block.dayOfWeek);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setClassroom(block.classroom || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    const inputData: ScheduleInput = {
      courseId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      classroom: classroom.trim() || null,
    };

    startTransition(async () => {
      try {
        if (editingBlock) {
          const updated = await updateSchedule(editingBlock.id, inputData);

          const selectedCourse = courses.find((c) => c.id === courseId)!;
          const formattedUpdated: ScheduleBlock = {
            ...(updated as any),
            course: {
              id: selectedCourse.id,
              name: selectedCourse.name,
              code: null, // Placeholder or we could enrich it
              color: selectedCourse.color,
            },
          };

          setSchedulesList((prev) =>
            prev
              .map((s) => (s.id === editingBlock.id ? formattedUpdated : s))
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
          );
        } else {
          const created = await createSchedule(inputData);

          const selectedCourse = courses.find((c) => c.id === courseId)!;
          const formattedCreated: ScheduleBlock = {
            ...(created as any),
            course: {
              id: selectedCourse.id,
              name: selectedCourse.name,
              code: null,
              color: selectedCourse.color,
            },
          };

          setSchedulesList((prev) =>
            [...prev, formattedCreated].sort(
              (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
            )
          );
        }
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al procesar el horario");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bloque de horario?")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSchedule(id);
        setSchedulesList((prev) => prev.filter((s) => s.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar");
      }
    });
  };

  // Group schedules by day of the week
  const getSchedulesForDay = (dayNum: number) => {
    return schedulesList.filter((s) => s.dayOfWeek === dayNum);
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Horarios de Clases</h1>
          <p className={styles.subtitle}>
            Organiza tus bloques de clases semanales para evitar solapamientos.
          </p>
        </div>
        {courses.length > 0 && (
          <button onClick={() => openAddModal()} className="btn btn-primary">
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
            Agregar Horario
          </button>
        )}
      </div>

      {courses.length === 0 ? (
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
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No tienes materias creadas</h3>
            <p style={{ fontSize: "0.875rem" }}>
              Primero debes crear al menos una materia para poder registrar sus horarios.
            </p>
          </div>
          <a href="/dashboard/courses" className="btn btn-primary">
            Ir a Materias
          </a>
        </div>
      ) : (
        <div className={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => {
            const dayBlocks = getSchedulesForDay(day.value);
            return (
              <div key={day.value} className={styles.dayColumn}>
                <h3 className={styles.dayTitle}>{day.label}</h3>

                <div className={styles.blocksList}>
                  {dayBlocks.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "hsl(var(--muted-foreground))",
                        fontSize: "0.75rem",
                        padding: "1.5rem 0",
                      }}
                    >
                      Sin clases
                    </div>
                  ) : (
                    dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={`${styles.classBlock} glassmorphism`}
                        style={{ "--course-color": block.course.color } as React.CSSProperties}
                      >
                        <h4 className={styles.className}>{block.course.name}</h4>

                        <div className={styles.classTime}>
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>
                            {block.startTime} - {block.endTime}
                          </span>
                        </div>

                        {block.classroom && (
                          <div className={styles.classRoom}>
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>{block.classroom}</span>
                          </div>
                        )}

                        <div className={styles.blockActions}>
                          <button
                            onClick={() => openEditModal(block)}
                            className={styles.actionBtn}
                            title="Editar"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(block.id)}
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            title="Eliminar"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    onClick={() => openAddModal(day.value)}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.4rem",
                      width: "100%",
                      fontSize: "0.75rem",
                      borderStyle: "dashed",
                    }}
                  >
                    + Bloque
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <Portal>
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editingBlock ? "Editar Horario" : "Agregar Horario"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className={styles.actionBtn}>
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
                  <label className={styles.formLabel}>Materia *</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={isPending}
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Día de la Semana *</label>
                  <select
                    required
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    disabled={isPending}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Hora de Inicio *</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isPending}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Hora de Fin *</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Aula / Salón (Opcional)</label>
                  <input
                    type="text"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    placeholder="Ej. Aula 102, Edificio Nuevo"
                    disabled={isPending}
                  />
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
                      : editingBlock
                        ? "Guardar Cambios"
                        : "Agregar Horario"}
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
