"use client";

import { useState, useTransition, useRef } from "react";
import { createMaterial, deleteMaterial } from "@/features/materials/actions";
import Portal from "@/components/ui/Portal";
import styles from "./materials.module.css";

interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
}

interface Material {
  id: string;
  courseId: string;
  title: string;
  type: "link" | "file";
  url: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: Date;
  courseName?: string;
  courseColor?: string;
}

interface MaterialManagerProps {
  courses: Course[];
  initialMaterials: Material[];
}

export default function MaterialManager({ courses, initialMaterials }: MaterialManagerProps) {
  const [materialsList, setMaterialsList] = useState<Material[]>(initialMaterials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "file">("link");
  const [isPending, startTransition] = useTransition();

  // Link Form State
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // File Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group materials by course
  const materialsByCourse = courses.reduce(
    (acc, course) => {
      acc[course.id] = materialsList.filter((m) => m.courseId === course.id);
      return acc;
    },
    {} as Record<string, Material[]>
  );

  const openAddModal = (defaultCourseId?: string) => {
    if (defaultCourseId) {
      setCourseId(defaultCourseId);
    } else if (courses.length > 0) {
      setCourseId(courses[0].id);
    }
    setTitle("");
    setLinkUrl("");
    setSelectedFile(null);
    setUploadProgress(null);
    setIsUploading(false);
    setIsModalOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      if (title === "") {
        // Auto fill title with file base name without extension
        const baseName = e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, "");
        setTitle(baseName);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (title === "") {
        const baseName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setTitle(baseName);
      }
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // File extensions / MIME type styling icons helper
  const getResourceIcon = (type: "link" | "file", fileType: string | null, url: string) => {
    if (type === "link") {
      // Return link icon
      return (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      );
    }

    // PDF files
    if (fileType?.includes("pdf") || url.endsWith(".pdf")) {
      return (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          style={{ color: "hsl(var(--destructive))" }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    }

    // Images
    if (fileType?.startsWith("image/") || url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
      return (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          style={{ color: "hsl(var(--success))" }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    }

    // Default file icon
    return (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
    );
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !linkUrl) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    startTransition(async () => {
      try {
        const result = await createMaterial({
          courseId,
          title,
          type: "link",
          url: formattedUrl,
        });

        setMaterialsList((prev) => [
          {
            id: result.id,
            courseId: result.courseId,
            title: result.title,
            type: "link",
            url: result.url,
            fileSize: null,
            fileType: null,
            createdAt: new Date(result.createdAt),
          },
          ...prev,
        ]);

        setIsModalOpen(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al registrar enlace");
      }
    });
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", selectedFile);

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);

          // Call Server Action to register in DB
          startTransition(async () => {
            try {
              const result = await createMaterial({
                courseId,
                title,
                type: "file",
                url: response.url,
                fileSize: response.size,
                fileType: response.type,
              });

              setMaterialsList((prev) => [
                {
                  id: result.id,
                  courseId: result.courseId,
                  title: result.title,
                  type: "file",
                  url: result.url,
                  fileSize: result.fileSize,
                  fileType: result.fileType,
                  createdAt: new Date(result.createdAt),
                },
                ...prev,
              ]);

              setIsModalOpen(false);
            } catch (err) {
              alert("Error al registrar el archivo en la base de datos");
            }
          });
        } catch (err) {
          alert("Error al procesar la respuesta del servidor");
        } finally {
          setIsUploading(false);
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          alert(`Error: ${errRes.error || "Fallo al subir el archivo"}`);
        } catch (e) {
          alert("Fallo al subir el archivo (Error del servidor)");
        }
        setIsUploading(false);
      }
    });

    xhr.addEventListener("error", () => {
      alert("Error de conexión al subir el archivo");
      setIsUploading(false);
    });

    xhr.open("POST", "/api/materials/upload");
    xhr.send(formData);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el recurso "${name}"?`)) return;

    startTransition(async () => {
      try {
        await deleteMaterial(id);
        setMaterialsList((prev) => prev.filter((m) => m.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar el material");
      }
    });
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Materiales de Estudio</h1>
          <p className={styles.subtitle}>
            Organiza tus diapositivas, documentos, carpetas de Drive, enlaces a videollamadas y
            material educativo.
          </p>
        </div>
        {courses.length > 0 && (
          <button onClick={() => openAddModal()} className="btn btn-primary">
            + Agregar Recurso
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
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              No tienes materias registradas
            </h3>
            <p style={{ fontSize: "0.875rem" }}>
              Crea materias antes de poder registrar tus materiales.
            </p>
          </div>
          <a href="/dashboard/courses" className="btn btn-primary">
            Registrar Materias
          </a>
        </div>
      ) : (
        <div className={styles.mainGrid}>
          {courses.map((course) => {
            const courseMaterials = materialsByCourse[course.id] || [];

            return (
              <section
                key={course.id}
                className={styles.courseSection}
                style={{ "--course-color": course.color } as React.CSSProperties}
              >
                <div className={styles.courseHeader}>
                  <div className={styles.courseInfo}>
                    <span className={styles.courseCode}>{course.code || "Sin código"}</span>
                    <h2 className={styles.courseName}>{course.name}</h2>
                  </div>
                  <button
                    onClick={() => openAddModal(course.id)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
                  >
                    + Recurso
                  </button>
                </div>

                {courseMaterials.length === 0 ? (
                  <div className={styles.emptyCourse}>
                    No hay recursos registrados para esta materia.
                  </div>
                ) : (
                  <div className={styles.materialsList}>
                    {courseMaterials.map((material) => (
                      <div key={material.id} className={styles.materialCard}>
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.materialLeft}
                          title={`Abrir ${material.title}`}
                        >
                          <div className={styles.iconWrapper}>
                            {getResourceIcon(material.type, material.fileType, material.url)}
                          </div>
                          <div className={styles.materialMeta}>
                            <span className={styles.materialTitle}>{material.title}</span>
                            <span className={styles.materialSub}>
                              {material.type === "link"
                                ? "Enlace de interés"
                                : formatBytes(material.fileSize)}
                            </span>
                          </div>
                        </a>
                        <button
                          onClick={() => handleDelete(material.id, material.title)}
                          className={styles.deleteBtn}
                          disabled={isPending}
                          title="Eliminar recurso"
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
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Form Modal Wrapped in Portal */}
      {isModalOpen && (
        <Portal>
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Agregar Recurso</h2>
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

              {/* Tab Header Selector */}
              <div className={styles.tabHeader}>
                <button
                  type="button"
                  onClick={() => setActiveTab("link")}
                  className={`${styles.tabBtn} ${activeTab === "link" ? styles.tabBtnActive : ""}`}
                  disabled={isUploading}
                >
                  🔗 Enlace Externo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("file")}
                  className={`${styles.tabBtn} ${activeTab === "file" ? styles.tabBtnActive : ""}`}
                  disabled={isUploading}
                >
                  📁 Subir Archivo
                </button>
              </div>

              {activeTab === "link" ? (
                /* Link Form */
                <form
                  key="link-form"
                  onSubmit={handleLinkSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Materia *</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
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
                    <label className={styles.formLabel}>Título / Nombre *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Carpeta de Google Drive o Notion"
                      disabled={isPending}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Dirección URL *</label>
                    <input
                      type="text"
                      required
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Ej. drive.google.com/..."
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
                      {isPending ? "Guardando..." : "Guardar Enlace"}
                    </button>
                  </div>
                </form>
              ) : (
                /* File Upload Form */
                <form
                  key="file-form"
                  onSubmit={handleFileUploadSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Materia *</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
                      disabled={isUploading || isPending}
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Título / Nombre del Recurso *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Diapositivas Tema 1"
                      disabled={isUploading || isPending}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Archivo *</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                      disabled={isUploading || isPending}
                    />

                    {!selectedFile ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaActive : ""}`}
                      >
                        <div className={styles.uploadIcon}>
                          <svg
                            viewBox="0 0 24 24"
                            width="32"
                            height="32"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                        </div>
                        <p className={styles.uploadText}>Haz clic o arrastra un archivo aquí</p>
                        <p className={styles.uploadSubtext}>
                          Límite máximo recomendado: 10 MB (PDF, Img, Doc)
                        </p>
                      </div>
                    ) : (
                      <div className={styles.fileSelectedCard}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            minWidth: 0,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            style={{ color: "hsl(var(--primary))", flexShrink: 0 }}
                          >
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              fontWeight: 500,
                            }}
                          >
                            {selectedFile.name}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}
                          >
                            ({formatBytes(selectedFile.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className={styles.deleteBtn}
                          disabled={isUploading || isPending}
                          style={{ padding: "0.2rem" }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {isUploading && uploadProgress !== null && (
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBarWrapper}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className={styles.progressText}>Subiendo: {uploadProgress}%</span>
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="btn btn-secondary"
                      disabled={isUploading || isPending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!selectedFile || isUploading || isPending}
                    >
                      {isUploading ? "Subiendo..." : isPending ? "Guardando..." : "Subir y Guardar"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
