import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export default function ResetPasswordPage() { return <AuthShell title="كلمة مرور جديدة" description="اختر كلمة مرور جديدة وآمنة لحسابك."><ResetPasswordForm /></AuthShell>; }
