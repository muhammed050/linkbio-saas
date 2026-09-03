"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type ActionState = "idle" | "copied" | "unavailable";

export function PageActions({ path, title }: { path: string; title: string }) {
  const [state, setState] = useState<ActionState>("idle");
  const pageUrl = () => new URL(path, window.location.origin).toString();
  async function copyPageLink() { try { await navigator.clipboard.writeText(pageUrl()); setState("copied"); } catch { setState("unavailable"); } }
  async function sharePage() { if (!navigator.share) { setState("unavailable"); return; } try { await navigator.share({ title, url: pageUrl() }); } catch { setState("idle"); } }
  return <div className="dashboard-page-actions"><button className="dashboard-action-button" type="button" onClick={copyPageLink}>{state === "copied" ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}{state === "copied" ? "تم النسخ" : "نسخ الرابط"}</button><button className="dashboard-action-button" type="button" onClick={sharePage}><Share2 aria-hidden="true" size={16} />مشاركة</button>{state === "unavailable" && <p className="dashboard-action-feedback" role="status">تعذر استخدام هذه الميزة من المتصفح الحالي.</p>}</div>;
}
