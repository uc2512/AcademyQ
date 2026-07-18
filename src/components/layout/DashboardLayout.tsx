import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./layout.module.css";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className={styles.layoutContainer}>
      <Sidebar userName={session.user.name} />
      <div className={styles.mainContent}>
        <Header user={session.user} />
        <main className={styles.pageBody}>{children}</main>
      </div>
    </div>
  );
}
