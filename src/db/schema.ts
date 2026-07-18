import { pgTable, uuid, text, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table (Linked with Auth.js / Google OAuth)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Teachers Table
export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  office: text("office"),
  phone: text("phone"),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Courses (Materias) Table
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  color: text("color").default("#6366f1").notNull(), // Hex color for calendar/dashboard
  teacherId: uuid("teacher_id").references(() => teachers.id, {
    onDelete: "set null",
  }),
  practicesCount: integer("practices_count").default(5).notNull(), // N configurable
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Class Schedules Table (Horarios de Clases)
export const schedules = pgTable("schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1 = Lunes, 2 = Martes, ..., 7 = Domingo
  startTime: text("start_time").notNull(), // "HH:MM" 24h format, e.g. "08:15"
  endTime: text("end_time").notNull(), // "HH:MM" 24h format, e.g. "09:45"
  classroom: text("classroom"), // room/classroom name
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Tasks and Exams Table
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(), // Date and time limit
  type: text("type").notNull(), // 'homework', 'project', 'exam_1', 'exam_2', 'exam_final', 'practice'
  practiceNumber: integer("practice_number"), // If type is 'practice', specifies which one (1 to N)
  completed: boolean("completed").default(false).notNull(),
  grade: real("grade"), // Calificación obtenida (0 a 100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Materials (Recursos y Enlaces) Table
export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'link' or 'file'
  url: text("url").notNull(), // External link or Vercel Blob file URL
  fileSize: integer("file_size"), // File size in bytes
  fileType: text("file_type"), // Mime type (e.g. application/pdf)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships definitions
export const usersRelations = relations(users, ({ many }) => ({
  teachers: many(teachers),
  courses: many(courses),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  teacher: one(teachers, {
    fields: [courses.teacherId],
    references: [teachers.id],
  }),
  schedules: many(schedules),
  tasks: many(tasks),
  materials: many(materials),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  course: one(courses, {
    fields: [schedules.courseId],
    references: [courses.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  course: one(courses, {
    fields: [tasks.courseId],
    references: [courses.id],
  }),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  course: one(courses, {
    fields: [materials.courseId],
    references: [courses.id],
  }),
}));
