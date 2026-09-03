import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminAccessError, requireAdmin } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try { await requireAdmin(); } catch (error) { if (error instanceof AdminAccessError && error.status === 401) redirect("/login"); redirect("/dashboard"); }
  return <div className="admin-shell"><header className="admin-header"><span className="wordmark">لينكا<span>·</span></span><span>الإدارة</span></header>{children}</div>;
}
