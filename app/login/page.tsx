import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() { return <AuthShell title="سجّل دخولك" description="أكمل من حيث توقفت وادِر صفحتك من مكان واحد."><AuthForm mode="login" /></AuthShell>; }
