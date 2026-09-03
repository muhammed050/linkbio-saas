import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) { const { email } = await searchParams; return <AuthShell title="تحقق من بريدك" description="أرسلنا إليك رسالة تأكيد لإكمال إنشاء حسابك."><div className="verify-content"><MailCheck size={42} aria-hidden="true" /><p>افتح البريد الإلكتروني {email && <strong dir="ltr">{email}</strong>} واضغط على رابط التحقق. يمكنك إغلاق هذه الصفحة بعد ذلك.</p><Link className="form-oauth" href="/login">العودة لتسجيل الدخول</Link></div></AuthShell>; }
