"use client";

import Link from "next/link";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

const PRO_PLAN_ID = "plan_LEZGjeiVurzLH";

export function CheckoutPageClient() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: 64,
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid rgba(0,0,0,.08)",
          background: "#fff",
        }}
      >
        <Link
          href="/pricing"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111",
            textDecoration: "none",
          }}
        >
          العودة إلى الأسعار
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
          LinkBio — Checkout
        </span>
        <span style={{ width: 110 }} aria-hidden="true" />
      </header>

      <section
        style={{
          flex: 1,
          width: "100%",
          minHeight: "calc(100dvh - 64px)",
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", minHeight: "100%" }}>
          <WhopCheckoutEmbed
            planId={PRO_PLAN_ID}
            returnUrl="https://linkbio1-ten.vercel.app/pricing?checkout=success"
            theme="light"
          />
        </div>
      </section>
    </main>
  );
}
