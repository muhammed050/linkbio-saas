import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="public-not-found"><Link className="profile-brand" href="/" aria-label="العودة إلى لينكا">لينكا<span>·</span></Link><section><p className="eyebrow">الصفحة غير متاحة</p><h1>لا توجد صفحة منشورة هنا</h1><p>قد يكون الرابط غير صحيح، أو أن صاحب الصفحة أوقف نشرها مؤقتاً.</p><Link className="button-primary" href="/">العودة إلى لينكا</Link></section></main>;
}
