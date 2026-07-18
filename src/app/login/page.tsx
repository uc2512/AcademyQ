import { signIn } from "@/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.bubble1} />
      <div className={styles.bubble2} />

      <div className={`${styles.card} glassmorphism`}>
        <div className={styles.header}>
          <div className={styles.logo}>AcademiQ</div>
          <h2 className={styles.title}>¡Bienvenido de nuevo!</h2>
          <p className={styles.subtitle}>
            Organiza tus materias, tareas, horarios y calificaciones en un solo lugar.
          </p>
        </div>

        <div className={styles.divider}>Ingresa con tu cuenta</div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className={styles.googleBtn}>
            <svg
              className={styles.googleIcon}
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              />
            </svg>
            Continuar con Google
          </button>
        </form>

        <div className={styles.footer}>
          Al continuar, aceptas la política de uso personal de la plataforma{" "}
          <span className={styles.footerLink}>AcademiQ</span>.
        </div>
      </div>
    </div>
  );
}
