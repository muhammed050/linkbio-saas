import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() { return <AuthShell title="لنبدأ صفحتك" description="أنشئ حسابك المجاني وشارك ما يهمك في رابط واحد."><AuthForm mode="signup" /></AuthShell>; }
