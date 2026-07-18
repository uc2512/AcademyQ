"use client";

import { useState, useEffect, useTransition } from "react";
import { upsertTaskGradeDirectly } from "@/features/tasks/grade-actions";
import { calculateCourseGrades, GradeSummary } from "@/lib/grades";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import styles from "./grades.module.css";

interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
  practicesCount: number;
}

interface Task {
  id: string;
  courseId: string;
  type: string;
  practiceNumber: number | null;
  grade: number | null;
}

interface GradeManagerProps {
  courses: Course[];
  initialTasks: Task[];
}

export default function GradeManager({ courses, initialTasks }: GradeManagerProps) {
  const [tasksList, setTasksList] = useState<Task[]>(initialTasks);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(courses[0]?.id || null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Inputs local state to handle editing values smoothly before database sync
  const [editingGrades, setEditingGrades] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate calculations for all courses
  const coursesGrades = courses.map((course) => {
    const courseTasks = tasksList.filter((t) => t.courseId === course.id);
    const summary = calculateCourseGrades(course.practicesCount, courseTasks);
    return {
      ...course,
      summary,
    };
  });

  // Calculate Global Academic KPI Stats
  const totalCourses = coursesGrades.length;
  const approvedCourses = coursesGrades.filter((cg) => cg.summary.isApproved).length;

  const sumFinalScores = coursesGrades.reduce((sum, cg) => sum + cg.summary.finalScore, 0);
  const globalAverage = totalCourses > 0 ? sumFinalScores / totalCourses : 0;

  const coursesInDanger = coursesGrades.filter((cg) => {
    // If not approved yet AND final exam is already taken or it is simulated to be impossible
    return !cg.summary.isApproved && cg.summary.notesNeededForPassing.impossibleToPass;
  }).length;

  const handleGradeChange = (
    courseId: string,
    type: string,
    practiceNumber: number | null,
    valStr: string
  ) => {
    const key = `${courseId}-${type}-${practiceNumber || 0}`;
    setEditingGrades((prev) => ({ ...prev, [key]: valStr }));
  };

  const handleGradeBlur = async (
    courseId: string,
    type: string,
    practiceNumber: number | null,
    valStr: string
  ) => {
    const key = `${courseId}-${type}-${practiceNumber || 0}`;

    // Clear editing state on blur
    setEditingGrades((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    const parsed = valStr.trim() === "" ? null : Number(valStr);

    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      alert("La nota debe ser un número entre 0 y 100");
      return;
    }

    startTransition(async () => {
      try {
        const result = await upsertTaskGradeDirectly(courseId, type, practiceNumber, parsed);
        if (result) {
          // Sync state locally
          setTasksList((prev) => {
            const index = prev.findIndex(
              (t) =>
                t.courseId === courseId &&
                t.type === type &&
                (type === "practice" ? t.practiceNumber === practiceNumber : true)
            );

            const mapped = {
              id: result.id,
              courseId: result.courseId,
              type: result.type,
              practiceNumber: result.practiceNumber,
              grade: result.grade,
            };

            if (index !== -1) {
              return prev.map((t, idx) => (idx === index ? mapped : t));
            } else {
              return [...prev, mapped];
            }
          });
        } else {
          // Deleted / set to null and no task existed or task was removed
          setTasksList((prev) =>
            prev.filter(
              (t) =>
                !(
                  t.courseId === courseId &&
                  t.type === type &&
                  (type === "practice" ? t.practiceNumber === practiceNumber : true)
                )
            )
          );
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al guardar la calificación");
      }
    });
  };

  const getTaskGrade = (courseId: string, type: string, practiceNumber: number | null): string => {
    const key = `${courseId}-${type}-${practiceNumber || 0}`;
    if (editingGrades[key] !== undefined) {
      return editingGrades[key];
    }

    const task = tasksList.find(
      (t) =>
        t.courseId === courseId &&
        t.type === type &&
        (type === "practice" ? t.practiceNumber === practiceNumber : true)
    );

    return task?.grade !== undefined && task.grade !== null ? String(task.grade) : "";
  };

  const toggleAccordion = (courseId: string) => {
    setExpandedCourse((prev) => (prev === courseId ? null : courseId));
  };

  // Prepare chart data format
  const chartData = coursesGrades.map((cg) => ({
    name: cg.name,
    "Nota Final": cg.summary.finalScore,
    Prácticas: cg.summary.practicesScore,
    Parciales: cg.summary.midtermsScore,
    Final: cg.summary.finalExamScore,
    color: cg.color,
  }));

  return (
    <div className="animate-fade-in">
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Notas y Calificaciones</h1>
          <p className={styles.subtitle}>
            Controla tu libreta de notas, simula notas requeridas y visualiza tus estadísticas de
            rendimiento.
          </p>
        </div>
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
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              No tienes materias registradas
            </h3>
            <p style={{ fontSize: "0.875rem" }}>
              Crea tus materias para poder gestionar tu sistema de notas.
            </p>
          </div>
          <a href="/dashboard/courses" className="btn btn-primary">
            Ir a Materias
          </a>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid */}
          <section className={styles.kpisGrid}>
            <div className={`${styles.kpiCard} glassmorphism`}>
              <span className={styles.kpiLabel}>Promedio General Ponderado</span>
              <span className={styles.kpiValue}>{Math.round(globalAverage * 100) / 100}</span>
              <span
                className={`${styles.kpiStatus} ${
                  globalAverage >= 51 ? styles.approved : styles.reproved
                }`}
              >
                {globalAverage >= 51 ? "Promedio Aprobatorio" : "Promedio Crítico"}
              </span>
            </div>

            <div className={`${styles.kpiCard} glassmorphism`}>
              <span className={styles.kpiLabel}>Materias Aprobadas</span>
              <span className={styles.kpiValue}>
                {approvedCourses} / {totalCourses}
              </span>
              <span
                className={`${styles.kpiStatus} styles.approved`}
                style={{
                  color: "hsl(var(--success))",
                  backgroundColor: "hsl(var(--success) / 0.1)",
                }}
              >
                Progreso del {Math.round((approvedCourses / totalCourses) * 100)}%
              </span>
            </div>

            <div className={`${styles.kpiCard} glassmorphism`}>
              <span className={styles.kpiLabel}>Materias en Riesgo</span>
              <span className={styles.kpiValue}>{coursesInDanger}</span>
              <span
                className={`${styles.kpiStatus} ${
                  coursesInDanger > 0 ? styles.reproved : styles.approved
                }`}
              >
                {coursesInDanger > 0 ? "Requiere Atención" : "Sin riesgo inminente"}
              </span>
            </div>
          </section>

          {/* Charts Row */}
          {mounted && (
            <section className={styles.chartsSection}>
              {/* Stacked Composition Chart */}
              <div className={`${styles.chartCard} glassmorphism`}>
                <h3 className={styles.chartTitle}>Composición Académica de Notas por Materia</h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border) / 0.3)"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "0.75rem" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "0.75rem" }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <ReferenceLine
                        y={51}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="3 3"
                        label={{
                          value: "Aprobación (51)",
                          fill: "hsl(var(--destructive))",
                          position: "insideBottomRight",
                          fontSize: 10,
                        }}
                      />
                      <Bar dataKey="Prácticas" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Parciales" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Final" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* General Performance KPI */}
              <div className={`${styles.chartCard} glassmorphism`}>
                <h3 className={styles.chartTitle}>Comparación PPA</h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border) / 0.3)"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "0.7rem" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "0.7rem" }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <ReferenceLine y={51} stroke="hsl(var(--destructive))" strokeWidth={1} />
                      <Bar
                        dataKey="Nota Final"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        barSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {/* Gradebook List */}
          <section style={{ marginBottom: "3rem" }}>
            <h2 className={styles.gradebookTitle}>Registro Académico de Calificaciones</h2>
            <div className={styles.coursesList}>
              {coursesGrades.map((course) => {
                const isExpanded = expandedCourse === course.id;
                const isApp = course.summary.isApproved;
                const passingSim = course.summary.notesNeededForPassing;

                return (
                  <div
                    key={course.id}
                    className={styles.courseItem}
                    style={{ "--course-color": course.color } as React.CSSProperties}
                  >
                    {/* Header Row (Accordion Clickable) */}
                    <div
                      onClick={() => toggleAccordion(course.id)}
                      className={styles.courseSummaryRow}
                    >
                      <div className={styles.courseNameBlock}>
                        <span className={styles.courseCode}>{course.code || "Sin código"}</span>
                        <h3 className={styles.courseName}>{course.name}</h3>
                      </div>

                      <div className={styles.gradeSummaryBadges}>
                        <div className={styles.scoreBadge}>
                          <span className={styles.scoreLabel}>Puntaje Final</span>
                          <span className={styles.scoreValue}>{course.summary.finalScore}</span>
                        </div>

                        <span
                          className={`${styles.statusIndicator} ${isApp ? styles.approved : styles.reproved}`}
                        >
                          {isApp ? "Aprobado" : "Reprobado"}
                        </span>

                        <svg
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform var(--transition-fast)",
                            color: "hsl(var(--muted-foreground))",
                          }}
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {isExpanded && (
                      <div className={styles.expandedContent}>
                        {/* Grade Inputs Panel */}
                        <div className={styles.inputsPanel}>
                          {/* 1. practices */}
                          <div
                            className={styles.formGroup}
                            style={{
                              borderBottom: "1px solid hsl(var(--border) / 0.5)",
                              paddingBottom: "1rem",
                            }}
                          >
                            <div className={styles.gradeInfo}>
                              <span className={styles.gradeTitle}>
                                Prácticas Calificadas (Promedio acumulado)
                              </span>
                              <span className={styles.gradeWeight}>
                                Representan el 35% de tu nota final. Promedio:{" "}
                                {course.summary.practicesAverage}/100
                              </span>
                            </div>

                            <div className={styles.practicesInputGrid}>
                              {Array.from({ length: course.practicesCount }, (_, idx) => {
                                const pNum = idx + 1;
                                return (
                                  <div key={pNum} className={styles.practiceCell}>
                                    <span className={styles.practiceNumLabel}>P#{pNum}</span>
                                    <input
                                      type="text"
                                      value={getTaskGrade(course.id, "practice", pNum)}
                                      onChange={(e) =>
                                        handleGradeChange(
                                          course.id,
                                          "practice",
                                          pNum,
                                          e.target.value
                                        )
                                      }
                                      onBlur={(e) =>
                                        handleGradeBlur(course.id, "practice", pNum, e.target.value)
                                      }
                                      placeholder="-"
                                      className={styles.gradeInput}
                                      disabled={isPending}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Parciales */}
                          <div className={styles.gradeRow}>
                            <div className={styles.gradeInfo}>
                              <span className={styles.gradeTitle}>Examen Parcial 1</span>
                              <span className={styles.gradeWeight}>
                                Equivale al 17.5% de tu nota final.
                              </span>
                            </div>
                            <input
                              type="text"
                              value={getTaskGrade(course.id, "exam_1", null)}
                              onChange={(e) =>
                                handleGradeChange(course.id, "exam_1", null, e.target.value)
                              }
                              onBlur={(e) =>
                                handleGradeBlur(course.id, "exam_1", null, e.target.value)
                              }
                              placeholder="-"
                              className={styles.gradeInput}
                              disabled={isPending}
                            />
                          </div>

                          <div className={styles.gradeRow}>
                            <div className={styles.gradeInfo}>
                              <span className={styles.gradeTitle}>Examen Parcial 2</span>
                              <span className={styles.gradeWeight}>
                                Equivale al 17.5% de tu nota final.
                              </span>
                            </div>
                            <input
                              type="text"
                              value={getTaskGrade(course.id, "exam_2", null)}
                              onChange={(e) =>
                                handleGradeChange(course.id, "exam_2", null, e.target.value)
                              }
                              onBlur={(e) =>
                                handleGradeBlur(course.id, "exam_2", null, e.target.value)
                              }
                              placeholder="-"
                              className={styles.gradeInput}
                              disabled={isPending}
                            />
                          </div>

                          {/* 3. Examen Final */}
                          <div className={styles.gradeRow} style={{ borderBottom: "none" }}>
                            <div className={styles.gradeInfo}>
                              <span className={styles.gradeTitle}>Examen Final</span>
                              <span className={styles.gradeWeight}>
                                Equivale al 30% de tu nota final.
                              </span>
                            </div>
                            <input
                              type="text"
                              value={getTaskGrade(course.id, "exam_final", null)}
                              onChange={(e) =>
                                handleGradeChange(course.id, "exam_final", null, e.target.value)
                              }
                              onBlur={(e) =>
                                handleGradeBlur(course.id, "exam_final", null, e.target.value)
                              }
                              placeholder="-"
                              className={styles.gradeInput}
                              disabled={isPending}
                            />
                          </div>
                        </div>

                        {/* Simulator Output Panel */}
                        <div className={styles.simulatorPanel}>
                          <h4 className={styles.simTitle}>
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              fill="none"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Planificador de Aprobación
                          </h4>

                          <p className={styles.simLabel}>
                            En base a tu acumulado actual en prácticas y exámenes parciales (
                            <strong>
                              {Math.round(
                                (course.summary.practicesScore + course.summary.midtermsScore) * 100
                              ) / 100}{" "}
                              / 70
                            </strong>{" "}
                            puntos), calculamos tus metas para el Examen Final:
                          </p>

                          {passingSim.alreadyPassed ? (
                            <div className={`${styles.simResult} ${styles.passGlow}`}>
                              🎉 ¡APROBADO! Ya has alcanzado {course.summary.finalScore} puntos.
                              Felicidades.
                            </div>
                          ) : passingSim.impossibleToPass ? (
                            <div className={`${styles.simResult} ${styles.dangerGlow}`}>
                              ⚠️ SITUACIÓN CRÍTICA. Incluso obteniendo 100 en el Examen Final, tu
                              acumulado máximo sería de{" "}
                              {Math.round(
                                (course.summary.practicesScore +
                                  course.summary.midtermsScore +
                                  30) *
                                  100
                              ) / 100}{" "}
                              puntos.
                            </div>
                          ) : (
                            <div className={`${styles.simResult} ${styles.infoGlow}`}>
                              Necesitas obtener al menos{" "}
                              <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                {passingSim.finalExamNeeded}
                              </span>{" "}
                              en el Examen Final para aprobar la materia con 51 puntos.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
