import { AlertCircle, ShieldCheck, Users } from "lucide-react";
import { getAdminOverview } from "@/lib/admin/data";

export default async function AdminPage() {
  let overview: Awaited<ReturnType<typeof getAdminOverview>> | null = null;
  let error: string | null = null;
  try { overview = await getAdminOverview(); } catch (caught) { error = caught instanceof Error ? caught.message : "حدث خطأ غير متوقع"; }
  return <main id="main-content" className="admin-main"><header><p className="eyebrow">إدارة محمية</p><h1>نظرة عامة</h1><p>البيانات المعروضة تأتي من خدمة الإدارة المحمية على الخادم.</p></header>{error || !overview ? <section className="admin-state error" role="alert"><AlertCircle aria-hidden="true" /><div><h2>تعذر تحميل بيانات الإدارة</h2><p>{error ?? "لا توجد بيانات متاحة حالياً."}</p></div></section> : <div className="admin-grid"><section className="admin-card"><h2><Users aria-hidden="true" />الحسابات</h2><div className="admin-empty"><strong>{overview.profileCount}</strong><p>إجمالي الحسابات المسجلة.</p></div></section><section className="admin-card"><h2><ShieldCheck aria-hidden="true" />الاشتراكات</h2><div className="admin-empty"><strong>{overview.subscriptionCount}</strong><p>إجمالي الاشتراكات المسجلة.</p></div></section><section className="admin-card admin-card-wide"><h2><AlertCircle aria-hidden="true" />آخر أحداث التكامل</h2>{overview.webhookEvents?.length ? <ul className="admin-list">{overview.webhookEvents.map((event) => <li key={event.id}><div><strong>{event.event_type}</strong><span dir="ltr">{event.provider} · {event.provider_event_id}</span></div><b>{event.status}</b></li>)}</ul> : <div className="admin-empty"><AlertCircle aria-hidden="true" /><p>لا توجد أحداث تكامل لعرضها حالياً.</p></div>}</section></div>}</main>;
}
