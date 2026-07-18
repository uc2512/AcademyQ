"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "@/app/dashboard/dashboard.module.css";

interface TodayClass {
  id: string;
  courseName: string;
  courseColor: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  classroom: string | null;
}

interface UpcomingTask {
  id: string;
  title: string;
  courseName: string;
  courseColor: string;
  dueDate: string; // ISO string
}

interface DashboardManagerProps {
  userName: string;
  coursesCount: number;
  teachersCount: number;
  globalAverage: number;
  pendingTasksCount: number;
  todaySchedules: TodayClass[];
  upcomingTasks: UpcomingTask[];
}

export default function DashboardManager({
  userName,
  coursesCount,
  teachersCount,
  globalAverage,
  pendingTasksCount,
  todaySchedules,
  upcomingTasks,
}: DashboardManagerProps) {
  // Client time trigger to update class status dynamically
  const [currentMinutes, setCurrentMinutes] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Process today's classes to calculate active/next statuses
  const processedClasses = todaySchedules
    .map((c) => {
      const start = timeToMinutes(c.startTime);
      const end = timeToMinutes(c.endTime);
      const isActive = currentMinutes >= start && currentMinutes <= end;
      const isFinished = currentMinutes > end;

      let progress = 0;
      if (isActive && end > start) {
        progress = ((currentMinutes - start) / (end - start)) * 100;
      }

      return {
        ...c,
        start,
        end,
        isActive,
        isFinished,
        progress,
      };
    })
    .sort((a, b) => a.start - b.start);

  // Identify the immediate next class
  const nextClassIndex = processedClasses.findIndex((c) => c.start > currentMinutes);

  // Format dynamic greeting message
  const getGreetingMessage = () => {
    const activeClasses = processedClasses.filter((c) => c.isActive).length;
    if (activeClasses > 0) {
      return `¡Tienes una clase en curso justo ahora! 🕒`;
    }

    const remainingClasses = processedClasses.filter((c) => !c.isFinished).length;
    if (remainingClasses > 0) {
      return `Tienes ${remainingClasses} clase${remainingClasses > 1 ? "s" : ""} por delante hoy.`;
    }

    if (processedClasses.length > 0) {
      return "Has completado todas tus clases programadas para hoy. ¡Bien hecho!";
    }

    return "No tienes clases programadas para hoy. ¡Disfruta de tu día libre para estudiar!";
  };

  // Format date helper
  const formatFriendlyDate = (dateStr: string): string => {
    const targetDate = new Date(dateStr);
    const now = new Date();

    // Check difference in days
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeString = targetDate.toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (diffDays === 0) {
      return `Hoy a las ${timeString}`;
    } else if (diffDays === 1) {
      return `Mañana a las ${timeString}`;
    } else if (diffDays > 1 && diffDays <= 7) {
      return `En ${diffDays} días (${targetDate.toLocaleDateString("es", { weekday: "short" })})`;
    } else if (diffDays < 0) {
      return `Expirado (${targetDate.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })})`;
    }
    return targetDate.toLocaleDateString("es", { day: "2-digit", month: "short" });
  };

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <h1 className={styles.welcomeTitle}>¡Hola, {userName}!</h1>
        <p className={styles.welcomeSub}>{getGreetingMessage()}</p>
      </section>

      {/* KPI Cards Grid */}
      <section className={styles.gridStats}>
        <div className={`${styles.statCard} glassmorphism`}>
          <div
            className={styles.statIcon}
            style={{ color: "hsl(var(--primary))", backgroundColor: "hsl(var(--primary) / 0.1)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{coursesCount}</span>
            <span className={styles.statLabel}>Materias</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div
            className={styles.statIcon}
            style={{ color: "hsl(var(--success))", backgroundColor: "hsl(var(--success) / 0.1)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{globalAverage}</span>
            <span className={styles.statLabel}>Promedio PPA</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div
            className={styles.statIcon}
            style={{ color: "#8b5cf6", backgroundColor: "rgb(139 92 246 / 10%)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{pendingTasksCount}</span>
            <span className={styles.statLabel}>Tareas Pendientes</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div
            className={styles.statIcon}
            style={{ color: "#f59e0b", backgroundColor: "rgb(245 158 11 / 10%)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{teachersCount}</span>
            <span className={styles.statLabel}>Docentes</span>
          </div>
        </div>
      </section>

      {/* Main Dashboard Modules Grid */}
      <section className={styles.dashboardGrid}>
        {/* Today's Agenda Panel */}
        <div className={styles.panelCard}>
          <div className={styles.panelTitleRow}>
            <h2 className={styles.panelTitle}>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Clases de Hoy
            </h2>
            <Link href="/dashboard/schedule" className={styles.viewAllLink}>
              Ver Horario Completo →
            </Link>
          </div>

          <div className={styles.agendaList}>
            {processedClasses.length === 0 ? (
              <div className={styles.emptyState}>
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>No tienes clases registradas para el día de hoy.</span>
              </div>
            ) : (
              processedClasses.map((item, idx) => (
                <div
                  key={item.id}
                  className={`${styles.classItem} ${item.isActive ? styles.classItemActive : ""}`}
                  style={
                    {
                      "--course-color": item.courseColor,
                      opacity: item.isFinished ? 0.6 : 1,
                    } as React.CSSProperties
                  }
                >
                  <div className={styles.classLeft}>
                    <span className={styles.className}>{item.courseName}</span>
                    <span className={styles.classMeta}>
                      {item.classroom ? `🏫 Aula: ${item.classroom}` : "🏫 Aula no especificada"}
                    </span>
                  </div>

                  <div className={styles.classRight}>
                    <span className={styles.classTime}>
                      {item.startTime} - {item.endTime}
                    </span>
                    {item.isActive && (
                      <span className={`${styles.statusBadge} ${styles.badgeActive}`}>
                        En Curso
                      </span>
                    )}
                    {idx === nextClassIndex && !item.isActive && (
                      <span className={`${styles.statusBadge} ${styles.badgeNext}`}>Siguiente</span>
                    )}
                  </div>

                  {item.isActive && item.progress > 0 && (
                    <div
                      className={styles.classProgressBar}
                      style={{ width: `${item.progress}%` }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks Panel */}
        <div className={styles.panelCard}>
          <div className={styles.panelTitleRow}>
            <h2 className={styles.panelTitle}>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Entregables Próximos
            </h2>
            <Link href="/dashboard/tasks" className={styles.viewAllLink}>
              Ver Calendario →
            </Link>
          </div>

          <div className={styles.tasksList}>
            {upcomingTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>¡Excelente! No tienes tareas o exámenes pendientes.</span>
              </div>
            ) : (
              upcomingTasks.map((task) => {
                const isOverdue = new Date(task.dueDate).getTime() < new Date().getTime();
                return (
                  <div key={task.id} className={styles.taskItem}>
                    <div className={styles.taskLeft}>
                      <div
                        className={styles.taskDot}
                        style={{ "--course-color": task.courseColor } as React.CSSProperties}
                      />
                      <div className={styles.taskMeta}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className={styles.taskCourseName}>{task.courseName}</span>
                      </div>
                    </div>

                    <span
                      className={`${styles.taskDueDate} ${isOverdue ? styles.taskDueDateOverdue : ""}`}
                    >
                      {formatFriendlyDate(task.dueDate)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions Panel */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Accesos Rápidos</h2>
      <section className={styles.quickAccessGrid}>
        <Link href="/dashboard/courses" className={styles.quickAccessBtn}>
          <div className={styles.quickBtnIcon}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <span className={styles.quickBtnLabel}>Materias</span>
        </Link>

        <Link href="/dashboard/schedule" className={styles.quickAccessBtn}>
          <div className={styles.quickBtnIcon}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <span className={styles.quickBtnLabel}>Horario</span>
        </Link>

        <Link href="/dashboard/tasks" className={styles.quickAccessBtn}>
          <div className={styles.quickBtnIcon}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <span className={styles.quickBtnLabel}>Entregables</span>
        </Link>

        <Link href="/dashboard/grades" className={styles.quickAccessBtn}>
          <div className={styles.quickBtnIcon}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <span className={styles.quickBtnLabel}>Libreta de Notas</span>
        </Link>

        <Link href="/dashboard/materials" className={styles.quickAccessBtn}>
          <div className={styles.quickBtnIcon}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </div>
          <span className={styles.quickBtnLabel}>Materiales</span>
        </Link>
      </section>
    </div>
  );
}
