"use client";

import { useState } from "react";
import { ArrowUpLeft } from "lucide-react";

export function CheckoutButton({ plan }: { plan: "pro" | "business" }) {
  const [state, setState] = useState<"idle" | "loading" | "unavailable">("idle");
  async function checkout() { setState("loading"); try { const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }); const payload: { checkoutUrl?: string; error?: string } = await response.json().catch(() => ({})); if (!response.ok || !payload.checkoutUrl) { setState("unavailable"); return; } window.location.assign(payload.checkoutUrl); } catch { setState("unavailable"); } }
  return <div><button className="pricing-action" type="button" onClick={checkout} disabled={state === "loading"}>{state === "loading" ? "جارٍ تجهيز الدفع…" : `اختر ${plan === "pro" ? "Pro" : "Business"}`}<ArrowUpLeft size={17} aria-hidden="true" /></button>{state === "unavailable" && <p className="checkout-notice" role="status">الدفع غير متاح حالياً. لم تكتمل إعدادات بوابة الدفع بعد.</p>}</div>;
}
