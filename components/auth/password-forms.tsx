"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowUpLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle"); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setState("loading"); setError(null); const email = String(new FormData(event.currentTarget).get("email")); const { error: requestError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }); if (requestError) { setError(requestError.message); setState("idle"); return; } setState("sent"); }
  if (state === "sent") return <div className="auth-form-wrap"><p className="form-alert success" role="status">إذا كان البريد مرتبطاً بحساب، أرسلنا إليه رابط إعادة التعيين.</p><p className="auth-switch"><Link href="/login">العودة لتسجيل الدخول</Link></p></div>;
  return <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="field"><label htmlFor="forgot-email">البريد الإلكتروني</label><input id="forgot-email" name="email" type="email" autoComplete="email" dir="ltr" required placeholder="name@example.com" /></div>{error && <p className="form-alert error" role="alert">{error}</p>}<button className="form-primary" type="submit" disabled={state === "loading"}>{state === "loading" ? "جارٍ الإرسال…" : "إرسال رابط إعادة التعيين"}<ArrowUpLeft size={18} aria-hidden="true" /></button></form><p className="auth-switch"><Link href="/login">العودة لتسجيل الدخول</Link></p></div>;
}

export function ResetPasswordForm() {
  const router = useRouter(); const [state, setState] = useState<"idle" | "loading" | "done">("idle"); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const password = String(new FormData(event.currentTarget).get("password")); setState("loading"); setError(null); const { error: updateError } = await createClient().auth.updateUser({ password }); if (updateError) { setError(updateError.message); setState("idle"); return; } setState("done"); router.push("/dashboard"); router.refresh(); }
  return <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="field"><label htmlFor="new-password">كلمة المرور الجديدة</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={6} required /></div>{error && <p className="form-alert error" role="alert">{error}</p>}<button className="form-primary" type="submit" disabled={state !== "idle"}>{state === "loading" ? "جارٍ الحفظ…" : state === "done" ? "تم الحفظ" : "حفظ كلمة المرور"}<ArrowUpLeft size={18} aria-hidden="true" /></button></form></div>;
}
