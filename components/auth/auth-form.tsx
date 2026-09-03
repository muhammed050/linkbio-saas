"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowUpLeft, Globe2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function message(error: { message?: string } | null) {
  return error?.message ?? "تعذر إتمام الطلب. حاول مرة أخرى.";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setNotice(null); setPending("email");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createClient();
    const result = isSignup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (result.error) { setError(message(result.error)); return; }
    if (isSignup && !result.data.session) { router.push(`/verify-email?email=${encodeURIComponent(email)}`); return; }
    if (isSignup) { setNotice("تم إنشاء حسابك بنجاح."); }
    router.push("/dashboard"); router.refresh();
  }

  async function google() {
    setError(null); setNotice(null); setPending("google");
    const { error: oauthError } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    if (oauthError) { setError(message(oauthError)); setPending(null); }
  }

  return <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit} noValidate><div className="field"><label htmlFor={`${mode}-email`}>البريد الإلكتروني</label><input id={`${mode}-email`} name="email" type="email" autoComplete="email" dir="ltr" required placeholder="name@example.com" /></div><div className="field"><div className="field-label-row"><label htmlFor={`${mode}-password`}>كلمة المرور</label>{!isSignup && <Link href="/forgot-password">هل نسيتها؟</Link>}</div><input id={`${mode}-password`} name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required /></div>{isSignup && <p className="form-hint">6 أحرف على الأقل. بمتابعة التسجيل، أنت توافق على استخدام لينكا.</p>}{error && <p className="form-alert error" role="alert">{error}</p>}{notice && <p className="form-alert success" role="status">{notice}</p>}<button className="form-primary" type="submit" disabled={pending !== null} aria-busy={pending === "email"}>{pending === "email" ? "جارٍ المتابعة…" : isSignup ? "إنشاء حساب" : "تسجيل الدخول"}<ArrowUpLeft size={18} aria-hidden="true" /></button></form><div className="form-divider"><span>أو</span></div><button className="form-oauth" type="button" onClick={google} disabled={pending !== null} aria-busy={pending === "google"}><Globe2 size={18} aria-hidden="true" />{pending === "google" ? "جارٍ التحويل…" : "المتابعة مع Google"}</button><p className="auth-switch">{isSignup ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "سجّل الدخول" : "أنشئ حساباً"}</Link></p></div>;
}
