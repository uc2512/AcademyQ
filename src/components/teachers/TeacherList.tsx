"use client";

import { useState, useTransition } from "react";
import {
  createTeacher,
  updateTeacher,
  deleteTeacher,
  TeacherInput,
} from "@/features/courses/teacher-actions";
import styles from "./teachers.module.css";
import Portal from "@/components/ui/Portal";

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  office: string | null;
  phone: string | null;
  photo: string | null;
}

interface TeacherListProps {
  initialTeachers: Teacher[];
}

export default function TeacherList({ initialTeachers }: TeacherListProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [office, setOffice] = useState("");
  const [phone, setPhone] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setOffice("");
    setPhone("");
    setEditingTeacher(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setEmail(teacher.email || "");
    setOffice(teacher.office || "");
    setPhone(teacher.phone || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const inputData: TeacherInput = {
      name: name.trim(),
      email: email.trim() || null,
      office: office.trim() || null,
      phone: phone.trim() || null,
    };

    startTransition(async () => {
      try {
        if (editingTeacher) {
          const updated = await updateTeacher(editingTeacher.id, inputData);
          setTeachers((prev) =>
            prev.map((t) => (t.id === editingTeacher.id ? (updated as Teacher) : t))
          );
        } else {
          const created = await createTeacher(inputData);
          setTeachers((prev) => [created as Teacher, ...prev]);
        }
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al procesar la solicitud");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar a este docente? Se desasignará de sus materias."
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteTeacher(id);
        setTeachers((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Docentes</h1>
          <p className={styles.subtitle}>
            Gestiona los datos de contacto y oficinas de tus profesores.
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
          Nuevo Docente
        </button>
      </div>

      {teachers.length === 0 ? (
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              No hay docentes registrados
            </h3>
            <p style={{ fontSize: "0.875rem" }}>
              Registra a tus profesores para poder asignarlos a tus materias.
            </p>
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            Agregar primer docente
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {teachers.map((teacher) => (
            <div key={teacher.id} className={`${styles.card} glassmorphism`}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>{getInitials(teacher.name)}</div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.name}>{teacher.name}</h3>
                  <span className={styles.email}>{teacher.email || "Sin correo"}</span>
                </div>
              </div>

              {(teacher.office || teacher.phone) && (
                <div className={styles.detailsList}>
                  {teacher.office && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Oficina:</span>
                      <span>{teacher.office}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Teléfono:</span>
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.cardActions}>
                <button
                  onClick={() => openEditModal(teacher)}
                  className={styles.iconBtn}
                  title="Editar docente"
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
                  onClick={() => handleDelete(teacher.id)}
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  title="Eliminar docente"
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
                  {editingTeacher ? "Editar Docente" : "Nuevo Docente"}
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
                  <label className={styles.formLabel}>Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Dr. Carlos Mendoza"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@universidad.edu"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Cubículo / Oficina</label>
                  <input
                    type="text"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                    placeholder="Ej. Edificio B, Cubículo 204"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Teléfono / Contacto</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +591 76543210"
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
                      : editingTeacher
                        ? "Guardar Cambios"
                        : "Crear Docente"}
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
