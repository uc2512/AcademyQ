"use client";

import { useUIStore } from "@/store/uiStore";
import { logOut } from "@/features/auth/actions";
import styles from "./layout.module.css";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Header({ user }: HeaderProps) {
  const { toggleSidebar } = useUIStore();

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className={styles.header}>
      <button className={styles.menuButton} onClick={toggleSidebar} aria-label="Toggle Menu">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className={styles.userMenu}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name || "Usuario"}</span>
          <span className={styles.userEmail}>{user?.email || ""}</span>
        </div>

        {user?.image ? (
          <img src={user.image} alt={user.name || "Avatar"} className={styles.avatar} />
        ) : (
          <div className={styles.avatar}>{getInitials(user?.name)}</div>
        )}

        <button
          onClick={async () => {
            await logOut();
          }}
          className={styles.logoutBtn}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
