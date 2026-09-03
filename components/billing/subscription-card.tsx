"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Loader2, XCircle } from "lucide-react";

interface BillingStatus {
  authenticated: boolean;
  plan: "free" | "pro" | "business";
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    manageUrl: string | null;
  } | null;
}

export function SubscriptionCard() {
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (response.status === 401) return;
      if (!response.ok) throw new Error("billing status failed");
      setData(await response.json());
    } catch {
      // Billing status is secondary to the public pricing page; fail silently.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function cancel() {
    if (!window.confirm("هل تريد إلغاء التجديد؟ سيبقى اشتراكك فعالاً حتى نهاية الفترة الحالية.")) return;
    setCanceling(true);
    setMessage(null);
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "تعذر إلغاء الاشتراك");
      setMessage("تم إلغاء التجديد. ستبقى مزاياك فعالة حتى نهاية الفترة الحالية.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إلغاء الاشتراك");
    } finally {
      setCanceling(false);
    }
  }

  if (loading || !data?.authenticated || !data.subscription || !["pro", "business"].includes(data.plan)) return null;

  const planName = data.plan === "pro" ? "Pro" : "Business";
  const endDate = data.subscription.currentPeriodEnd ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(data.subscription.currentPeriodEnd)) : null;

  return (
    <section aria-label="الاشتراك الحالي" style={{ margin: "0 auto 28px", width: "min(100%, 1120px)", padding: "0 20px" }}>
      <div style={{ border: "1px solid rgba(17,24,39,.1)", borderRadius: 22, padding: 20, background: "#fff", boxShadow: "0 12px 35px rgba(17,24,39,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={22} aria-hidden="true" />
            <div>
              <strong style={{ display: "block", fontSize: 16 }}>اشتراكك الحالي: {planName}</strong>
              <span style={{ display: "block", marginTop: 4, color: "#667085", fontSize: 13 }}>
                {data.subscription.cancelAtPeriodEnd ? `الإلغاء مجدول — المزايا مستمرة حتى ${endDate ?? "نهاية الفترة"}` : `اشتراك نشط${endDate ? ` حتى ${endDate}` : ""}`}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            {data.subscription.manageUrl && <a href={data.subscription.manageUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 14px", borderRadius: 11, border: "1px solid rgba(17,24,39,.12)", color: "#111827", textDecoration: "none", fontSize: 13, fontWeight: 600 }}><ExternalLink size={15} aria-hidden="true" /> إدارة الدفع</a>}
            {!data.subscription.cancelAtPeriodEnd && <button type="button" onClick={cancel} disabled={canceling} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 14px", borderRadius: 11, border: "1px solid rgba(180,35,24,.18)", background: "#fff", color: "#b42318", cursor: canceling ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}>
              {canceling ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />} إلغاء التجديد
            </button>}
          </div>
        </div>
        {data.subscription.cancelAtPeriodEnd && <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, color: "#7a5b00", fontSize: 13 }}><Clock3 size={15} aria-hidden="true" /> لن يتم التجديد تلقائياً.</div>}
        {message && <p role="status" style={{ margin: "14px 0 0", fontSize: 13, color: message.startsWith("تم") ? "#067647" : "#b42318" }}>{message}</p>}
      </div>
    </section>
  );
}
