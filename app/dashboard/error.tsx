"use client";

import { AlertCircle } from "lucide-react";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="dashboard-error-page" id="main-content"><section className="dashboard-error-state" role="alert" aria-labelledby="dashboard-error-title"><AlertCircle aria-hidden="true" size={28} /><div><h1 id="dashboard-error-title">تعذر تحميل بيانات التحليلات</h1><p>لم نتمكن من جلب بيانات التحليلات الآن، لذلك لم نعرض أي أرقام. حاول مرة أخرى.</p><button type="button" onClick={() => reset()}>إعادة المحاولة</button></div></section></main>;
}
