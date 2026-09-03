"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export function CheckoutPageClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (plan !== "pro" && plan !== "business") {
      setError("الباقة المطلوبة غير صالحة.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.checkoutUrl) throw new Error(result?.error || "تعذر بدء عملية الدفع");
        if (!cancelled) window.location.assign(result.checkoutUrl);
      } catch (checkoutError) {
        if (!cancelled) setError(checkoutError instanceof Error ? checkoutError.message : "تعذر بدء عملية الدفع");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <main dir="rtl" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f7f7f5" }}>
      <section style={{ width: "min(100%, 480px)", padding: 32, borderRadius: 24, background: "#fff", border: "1px solid rgba(17,24,39,.09)", boxShadow: "0 20px 60px rgba(17,24,39,.08)", textAlign: "center" }}>
        {!error ? <>
          <Loader2 size={28} className="animate-spin" aria-hidden="true" style={{ margin: "0 auto 16px" }} />
          <h1 style={{ margin: 0, fontSize: 22 }}>جاري فتح صفحة الدفع</h1>
          <p style={{ margin: "10px 0 0", color: "#667085", lineHeight: 1.7 }}>سيتم نقلك الآن إلى صفحة الدفع الآمنة الخاصة بـ Whop.</p>
        </> : <>
          <h1 style={{ margin: 0, fontSize: 22 }}>تعذر فتح الدفع</h1>
          <p role="alert" style={{ margin: "10px 0 20px", color: "#b42318", lineHeight: 1.7 }}>{error}</p>
          <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#111827", fontWeight: 700 }}><ArrowRight size={16} /> العودة إلى الأسعار</Link>
        </>}
      </section>
    </main>
  );
}
