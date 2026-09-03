import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  return <main id="main-content" className="auth-page"><section className="auth-panel" aria-labelledby="auth-title"><Link className="wordmark" href="/">لينكا<span>·</span></Link><div className="auth-intro"><p className="eyebrow">مرحباً بك</p><h1 id="auth-title">{title}</h1><p>{description}</p></div>{children}</section><aside className="auth-aside" aria-hidden="true"><div><span>رابط واحد</span><strong>لكل ما<br />تمثّله.</strong><p>أنشئ مساحة خاصة تجمع روابطك وأعمالك وقصتك.</p></div></aside></main>;
}
