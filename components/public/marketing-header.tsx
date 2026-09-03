import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";

export function MarketingHeader() {
  return <header className="marketing-header"><Link className="wordmark" href="/">لينكا<span>·</span></Link><nav aria-label="التنقل الرئيسي"><Link href="/templates">القوالب</Link><Link href="/pricing">الأسعار</Link><Link href="/#how-it-works">كيف تعمل</Link></nav><Link className="header-cta" href="/signup">ابدأ مجاناً <ArrowUpLeft size={16} aria-hidden="true" /></Link></header>;
}
