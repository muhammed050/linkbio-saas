import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export default function ForgotPasswordPage() { return <AuthShell title="استعادة كلمة المرور" description="أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة التعيين."><ForgotPasswordForm /></AuthShell>; }
