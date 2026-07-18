"use client";

import { useState, useTransition } from "react";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  TaskInput,
} from "@/features/tasks/actions";
import styles from "./tasks.module.css";
import Portal from "@/components/ui/Portal";

interface Course {
  id: string;
  name: string;
  color: string;
  practicesCount: number;
}

interface ScheduleBlock {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  course: {
    name: string;
    color: string;
  };
}

interface Task {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  dueDate: Date;
  type: string;
  practiceNumber: number | null;
  completed: boolean;
  course: {
    id: string;
    name: string;
    code: string | null;
    color: string;
  };
}

interface TaskManagerProps {
  initialTasks: Task[];
  courses: Course[];
  schedules: ScheduleBlock[];
}

const TASK_TYPES = [
  { value: "homework", label: "Tarea" },
  { value: "project", label: "Proyecto" },
  { value: "exam_1", label: "Examen Parcial 1" },
  { value: "exam_2", label: "Examen Parcial 2" },
  { value: "exam_final", label: "Examen Final" },
  { value: "practice", label: "Práctica" },
];

export default function TaskManager({ initialTasks, courses, schedules }: TaskManagerProps) {
  const [tasksList, setTasksList] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCompleted, setFilterCompleted] = useState("pending"); // pending, completed, all

  // Form states
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDateStr, setDueDateStr] = useState(""); // YYYY-MM-DDTHH:MM
  const [type, setType] = useState("homework");
  const [practiceNumber, setPracticeNumber] = useState(1);

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const selectedCourse = courses.find((c) => c.id === courseId);

  const resetForm = () => {
    setCourseId(courses[0]?.id || "");
    setTitle("");
    setDescription("");
    // Set default date to tomorrow at 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    // Format to local ISO string without timezone (YYYY-MM-DDTHH:MM)
    const offset = tomorrow.getTimezoneOffset();
    const localTomorrow = new Date(tomorrow.getTime() - offset * 60 * 1000);
    setDueDateStr(localTomorrow.toISOString().slice(0, 16));
    setType("homework");
    setPracticeNumber(1);
    setEditingTask(null);
  };

  const openAddModal = (initialDate?: Date) => {
    resetForm();
    if (initialDate) {
      const offset = initialDate.getTimezoneOffset();
      const localDate = new Date(initialDate.getTime() - offset * 60 * 1000);
      setDueDateStr(localDate.toISOString().slice(0, 16));
    }
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setCourseId(task.courseId);
    setTitle(task.title);
    setDescription(task.description || "");
    setType(task.type);
    setPracticeNumber(task.practiceNumber || 1);

    const offset = task.dueDate.getTimezoneOffset();
    const localDate = new Date(task.dueDate.getTime() - offset * 60 * 1000);
    setDueDateStr(localDate.toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const handleToggleComplete = async (id: string) => {
    startTransition(async () => {
      try {
        const updated = await toggleTaskCompletion(id);
        setTasksList((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: updated.completed } : t))
        );
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al completar");
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !dueDateStr) return;

    const inputData: TaskInput = {
      courseId,
      title: title.trim(),
      description: description.trim() || null,
      dueDate: new Date(dueDateStr),
      type,
      practiceNumber: type === "practice" ? Number(practiceNumber) : null,
    };

    startTransition(async () => {
      try {
        if (editingTask) {
          const updated = await updateTask(editingTask.id, inputData);
          const courseDetails = courses.find((c) => c.id === courseId)!;
          const formattedUpdated: Task = {
            ...(updated as any),
            dueDate: new Date(updated.dueDate), // ensure Date object
            course: {
              id: courseDetails.id,
              name: courseDetails.name,
              code: null,
              color: courseDetails.color,
            },
          };

          setTasksList((prev) =>
            prev
              .map((t) => (t.id === editingTask.id ? formattedUpdated : t))
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          );
        } else {
          const created = await createTask(inputData);
          const courseDetails = courses.find((c) => c.id === courseId)!;
          const formattedCreated: Task = {
            ...(created as any),
            dueDate: new Date(created.dueDate),
            course: {
              id: courseDetails.id,
              name: courseDetails.name,
              code: null,
              color: courseDetails.color,
            },
          };

          setTasksList((prev) =>
            [...prev, formattedCreated].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          );
        }
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al procesar entregable");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteTask(id);
        setTasksList((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar");
      }
    });
  };

  // Filter logic
  const filteredTasks = tasksList.filter((task) => {
    const matchesCourse = filterCourse ? task.courseId === filterCourse : true;
    const matchesType = filterType ? task.type === filterType : true;
    const matchesCompleted =
      filterCompleted === "all"
        ? true
        : filterCompleted === "completed"
          ? task.completed
          : !task.completed;

    return matchesCourse && matchesType && matchesCompleted;
  });

  // Calendar helpers
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const generateCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
    if (startDay === 0) startDay = 7; // Convert Sun to 7

    const daysInM = new Date(year, month + 1, 0).getDate();
    const daysInPrevM = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = startDay - 1; i > 0; i--) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevM - i + 1),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInM; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const totalCells = cells.length <= 35 ? 35 : 42;
    const nextPadding = totalCells - cells.length;
    for (let i = 1; i <= nextPadding; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  const getCalendarDayTasks = (date: Date) => {
    return tasksList.filter((t) => {
      const dDate = new Date(t.dueDate);
      return (
        dDate.getDate() === date.getDate() &&
        dDate.getMonth() === date.getMonth() &&
        dDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getCalendarDayClasses = (date: Date) => {
    // getDay() is 0 for Sun, 1 for Mon ...
    let dayOfWeekNum = date.getDay();
    if (dayOfWeekNum === 0) dayOfWeekNum = 7; // map to 7
    return schedules.filter((s) => s.dayOfWeek === dayOfWeekNum);
  };

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Tareas y Exámenes</h1>
          <p className={styles.subtitle}>
            Planifica tus entregas y visualiza tus exámenes y clases en el calendario.
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
            Nuevo Entregable
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
              Crea tus materias para poder registrar sus tareas y exámenes.
            </p>
          </div>
          <a href="/dashboard/courses" className="btn btn-primary">
            Ir a Materias
          </a>
        </div>
      ) : (
        <>
          {/* Controls and Tabs */}
          <div className={styles.controlsRow}>
            <div className={styles.tabs}>
              <button
                onClick={() => setActiveTab("list")}
                className={`${styles.tabBtn} ${activeTab === "list" ? styles.tabBtnActive : ""}`}
              >
                Lista de Tareas
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`${styles.tabBtn} ${activeTab === "calendar" ? styles.tabBtnActive : ""}`}
              >
                Calendario
              </button>
            </div>

            {activeTab === "list" && (
              <div className={styles.filters}>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">Todas las materias</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">Todos los tipos</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="pending">Pendientes</option>
                  <option value="completed">Completadas</option>
                  <option value="all">Todas</option>
                </select>
              </div>
            )}
          </div>

          {/* LIST VIEW */}
          {activeTab === "list" && (
            <div className={styles.tasksList}>
              {filteredTasks.length === 0 ? (
                <div
                  className={styles.emptyState}
                  style={{ borderStyle: "solid", padding: "3rem" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="36"
                    height="36"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p style={{ fontSize: "0.9rem" }}>
                    No se encontraron tareas con los filtros seleccionados.
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const typeLabel =
                    TASK_TYPES.find((t) => t.value === task.type)?.label || task.type;
                  const isOverdue =
                    new Date(task.dueDate).getTime() < Date.now() && !task.completed;
                  return (
                    <div
                      key={task.id}
                      className={`${styles.taskItem} glassmorphism ${
                        task.completed ? styles.taskItemCompleted : ""
                      }`}
                      style={{ "--course-color": task.course.color } as React.CSSProperties}
                    >
                      <div className={styles.taskLeft}>
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className={`${styles.checkbox} ${
                            task.completed ? styles.checkboxChecked : ""
                          }`}
                          aria-label="Marcar como completada"
                          disabled={isPending}
                        >
                          {task.completed && (
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>

                        <div className={styles.taskContent}>
                          <h3
                            className={`${styles.taskTitle} ${
                              task.completed ? styles.taskTitleCompleted : ""
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className={styles.taskDesc}>{task.description}</p>
                          )}

                          <div className={styles.taskMeta}>
                            <span className={styles.metaItem}>
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                              >
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                              </svg>
                              {task.course.name}
                            </span>
                            <span className={styles.metaItem}>
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              Entregar:{" "}
                              {new Date(task.dueDate).toLocaleString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isOverdue && (
                              <span
                                style={{
                                  color: "hsl(var(--destructive))",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="12"
                                  height="12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                Atrasada
                              </span>
                            )}
                            <span
                              className={`${styles.badge} ${
                                task.type === "homework"
                                  ? styles.badgeHomework
                                  : task.type === "project"
                                    ? styles.badgeProject
                                    : task.type === "practice"
                                      ? styles.badgePractice
                                      : styles.badgeExam
                              }`}
                            >
                              {typeLabel}{" "}
                              {task.type === "practice" &&
                                task.practiceNumber &&
                                `#${task.practiceNumber}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.taskActions}>
                        <button
                          onClick={() => openEditModal(task)}
                          className={styles.actionBtn}
                          title="Editar"
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
                          onClick={() => handleDelete(task.id)}
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          title="Eliminar"
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
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CALENDAR VIEW */}
          {activeTab === "calendar" && (
            <div className={styles.calendarContainer}>
              <div className={styles.calendarHeader}>
                <h2 className={styles.monthLabel}>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <div className={styles.navRow}>
                  <button onClick={prevMonth} className={styles.actionBtn}>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    >
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button onClick={nextMonth} className={styles.actionBtn}>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.calendarGrid}>
                {/* Days of week titles */}
                <div className={styles.dayOfWeekLabel}>Lun</div>
                <div className={styles.dayOfWeekLabel}>Mar</div>
                <div className={styles.dayOfWeekLabel}>Mié</div>
                <div className={styles.dayOfWeekLabel}>Jue</div>
                <div className={styles.dayOfWeekLabel}>Vie</div>
                <div className={styles.dayOfWeekLabel}>Sáb</div>
                <div className={styles.dayOfWeekLabel}>Dom</div>

                {/* Day cells */}
                {generateCalendarCells().map((cell, idx) => {
                  const dayTasks = getCalendarDayTasks(cell.date);
                  const dayClasses = getCalendarDayClasses(cell.date);

                  const today = new Date();
                  const isToday =
                    cell.date.getDate() === today.getDate() &&
                    cell.date.getMonth() === today.getMonth() &&
                    cell.date.getFullYear() === today.getFullYear();

                  return (
                    <div
                      key={idx}
                      className={`${styles.calendarCell} ${
                        !cell.isCurrentMonth ? styles.calendarCellOutside : ""
                      } ${isToday ? styles.calendarCellToday : ""}`}
                      onDoubleClick={() => cell.isCurrentMonth && openAddModal(cell.date)}
                    >
                      <span className={styles.dayNum}>{cell.date.getDate()}</span>

                      <div className={styles.cellItems}>
                        {/* 1. Classes */}
                        {cell.isCurrentMonth &&
                          dayClasses.map((clBlock) => (
                            <div
                              key={clBlock.id}
                              className={styles.cellClass}
                              style={
                                { "--course-color": clBlock.course.color } as React.CSSProperties
                              }
                              title={`${clBlock.course.name} (${clBlock.startTime}-${clBlock.endTime})`}
                            >
                              📚 {clBlock.course.name}
                            </div>
                          ))}

                        {/* 2. Tasks */}
                        {dayTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => openEditModal(t)}
                            className={`${styles.cellTask} ${
                              t.completed ? styles.cellTaskCompleted : ""
                            }`}
                            style={{ "--course-color": t.course.color } as React.CSSProperties}
                            title={`${t.title} (Límite: ${t.dueDate.toLocaleTimeString()})`}
                          >
                            {t.type === "exam_1" || t.type === "exam_2" || t.type === "exam_final"
                              ? "📝"
                              : "📅"}{" "}
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <Portal>
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editingTask ? "Editar Entregable" : "Nuevo Entregable"}
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
                  <label className={styles.formLabel}>Título *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Tarea de Integrales"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instrucciones, links o comentarios..."
                    rows={3}
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Materia *</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={isPending}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={styles.formRow}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tipo *</label>
                    <select
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      disabled={isPending}
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Fecha & Hora Límite *</label>
                    <input
                      type="datetime-local"
                      required
                      value={dueDateStr}
                      onChange={(e) => setDueDateStr(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {type === "practice" && selectedCourse && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Número de Práctica (de N) *</label>
                    <select
                      value={practiceNumber}
                      onChange={(e) => setPracticeNumber(Number(e.target.value))}
                      disabled={isPending}
                    >
                      {Array.from({ length: selectedCourse.practicesCount }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num}>
                            Práctica #{num} (Máximo {selectedCourse.practicesCount})
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

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
                    {isPending ? "Guardando..." : editingTask ? "Guardar Cambios" : "Crear Tarea"}
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
