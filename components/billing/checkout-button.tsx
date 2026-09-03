"use client";

import { ArrowUpLeft } from "lucide-react";

export function CheckoutButton({ plan }: { plan: "pro" | "business" }) {
  return (
    <button
      className="pricing-action"
      type="button"
      onClick={() => {
        window.location.href = `/checkout?plan=${plan}`;
      }}
    >
      {plan === "pro" ? "اختر Pro" : "اختر Business"}
      <ArrowUpLeft size={17} aria-hidden="true" />
    </button>
  );
}
