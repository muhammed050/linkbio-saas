"use client";

import { useState } from "react";
import { ArrowUpLeft, X } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

const TEST_PRO_PLAN_ID = "plan_LEZGjeiVurzLH";

export function CheckoutButton({ plan }: { plan: "pro" | "business" }) {
  const [open, setOpen] = useState(false);

  // Pro is wired to the verified Whop plan for the first live checkout test.
  // Business stays on the existing server checkout flow until its Whop plan ID is configured.
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
              zIndex: 1000,
              display: "grid",
              placeItems: "center",
              padding: "24px",
              background: "rgba(0,0,0,.48)",
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              style={{
                position: "relative",
                width: "min(100%, 520px)",
                maxHeight: "92vh",
                overflow: "auto",
                borderRadius: "20px",
                background: "white",
                padding: "16px",
                boxShadow: "0 24px 80px rgba(0,0,0,.22)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                style={{
                  position: "absolute",
                  top: "12px",
                  insetInlineEnd: "12px",
                  zIndex: 2,
                  width: "34px",
                  height: "34px",
                  display: "grid",
                  placeItems: "center",
                  border: 0,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,.06)",
                  cursor: "pointer",
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>

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
