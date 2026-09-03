"use client";

import { useState } from "react";
import { ArrowUpLeft, X } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

const TEST_PRO_PLAN_ID = "plan_LEZGjeiVurzLH";

export function CheckoutButton({ plan }: { plan: "pro" | "business" }) {
  const [open, setOpen] = useState(false);

  if (plan === "pro") {
    return (
      <>
        <button className="pricing-action" type="button" onClick={() => setOpen(true)}>
          اختر Pro
          <ArrowUpLeft size={17} aria-hidden="true" />
        </button>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="الدفع عبر Whop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              width: "100vw",
              height: "100dvh",
              minHeight: "100vh",
              margin: 0,
              padding: 0,
              background: "white",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
              style={{
                position: "fixed",
                top: "16px",
                insetInlineEnd: "16px",
                zIndex: 10001,
                width: "40px",
                height: "40px",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(0,0,0,.12)",
                borderRadius: "50%",
                background: "rgba(255,255,255,.92)",
                boxShadow: "0 4px 20px rgba(0,0,0,.12)",
                cursor: "pointer",
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: "100dvh",
                overflow: "auto",
                padding: "0",
              }}
            >
              <WhopCheckoutEmbed
                planId={TEST_PRO_PLAN_ID}
                returnUrl="https://linkbio1-ten.vercel.app/pricing?checkout=success"
                theme="light"
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <button
        className="pricing-action"
        type="button"
        onClick={() => {
          window.location.href = "/pricing?billing=setup-required";
        }}
      >
        اختر Business
        <ArrowUpLeft size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
