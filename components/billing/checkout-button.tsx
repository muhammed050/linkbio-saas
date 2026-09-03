"use client";

import { useState } from "react";
import { ArrowUpLeft, Loader2 } from "lucide-react";

export function CheckoutButton({ plan }: { plan: "pro" | "business" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.checkoutUrl) {
        throw new Error(result?.error || "تعذر بدء عملية الدفع");
      }
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "تعذر بدء عملية الدفع");
    }
  }

  return (
    <div>
      <button className="pricing-action" type="button" onClick={startCheckout} disabled={loading} aria-busy={loading}>
        {loading ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> جاري فتح الدفع...</> : <>{plan === "pro" ? "اشترك في Pro" : "اشترك في Business"}<ArrowUpLeft size={17} aria-hidden="true" /></>}
      </button>
      {error && <p role="alert" style={{ marginTop: 8, fontSize: 13, color: "#b42318" }}>{error}</p>}
    </div>
  );
}
