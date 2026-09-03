import Link from "next/link";
import { Check, Lock, Sparkles, Crown } from "lucide-react";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { SubscriptionCard } from "@/components/billing/subscription-card";
import { MarketingHeader } from "@/components/public/marketing-header";
import styles from "./pricing-page.module.css";

const plans = [
  { name: "Free", price: "$0", description: "صفحة حقيقية ومفيدة بدون دفع، لتبدأ وتثبت فكرتك.", features: ["10 روابط", "3 أقسام", "منتج واحد + خدمة واحدة", "كل الأيقونات الاجتماعية", "8 قوالب أساسية", "معاينة مباشرة", "رفع صورة من الجهاز"], locked: ["تحليلات متقدمة", "QR Code", "SEO المتقدم", "النطاق المخصص", "الجدولة", "إزالة علامة لينكا"], action: "free" },
  { name: "Pro", price: "$29", description: "للمبدعين الذين يريدون تحويل الصفحة إلى قناة نمو وبيع.", features: ["كل ما في Free", "روابط وأقسام ومنتجات وخدمات بلا حدود", "تحليلات متقدمة", "QR Code", "SEO وبيانات المشاركة", "نطاق مخصص", "تصميم وخطوط وخلفيات متقدمة", "إزالة علامة لينكا", "جدولة الروابط", "تصدير البيانات"], locked: ["دعم أولوية", "ميزات فرق الأعمال"], action: "pro" },
  { name: "Business", price: "$79", description: "للشركات والفرق التي تحتاج تحكماً ونمواً ودعماً أعلى.", features: ["كل مزايا Pro", "دعم ذو أولوية", "Newsletter بدون حد", "Pixels وUTM", "إدارة حملات ونمو متقدم", "سعة غير محدودة"], locked: [], action: "business" },
] as const;

export default function PricingPage() {
  return (
    <div className={styles.shell}>
      <MarketingHeader />
      <main id="main-content" className={styles.main}>
        <header className={styles.heading}>
          <p className={`eyebrow ${styles.eyebrow}`}><Sparkles size={15} aria-hidden="true" /> خطط مصممة للنمو</p>
          <h1>ابدأ مجاناً.<br />ادفع فقط عندما تحتاج المزيد.</h1>
          <p>النسخة المجانية ليست تجربة ناقصة: ابنِ صفحة كاملة وابدأ بجمهورك. عندما تحتاج التحليلات، البيع المتقدم، النطاق والتخصيص الاحترافي، انتقل إلى Pro.</p>
        </header>

        <SubscriptionCard />

        <section className={styles.grid} aria-label="خطط الاشتراك">
          {plans.map((plan) => (
            <article className={`${styles.card} ${plan.name === "Pro" ? styles.featured : ""}`} key={plan.name}>
              {plan.name === "Pro" && <span className={styles.badge}>الأكثر اختياراً</span>}
              <div className={styles.nameRow}>
                <h2>{plan.name}</h2>
                {plan.name === "Pro" && <span className={styles.proMark}><Crown size={17} aria-hidden="true" /></span>}
              </div>
              <p className={styles.description}>{plan.description}</p>
              <p className={styles.price}><strong>{plan.price}</strong>{plan.price !== "$0" && <span>/ شهرياً</span>}</p>

              <ul className={styles.features}>
                {plan.features.map((feature) => <li key={feature}><Check className={styles.check} size={16} aria-hidden="true" />{feature}</li>)}
              </ul>

              {plan.locked.length > 0 && (
                <div className={styles.locked}>
                  <p className={styles.lockedTitle}>مزايا تفتحها مع الترقية</p>
                  <ul className={styles.lockedList}>
                    {plan.locked.map((feature) => <li key={feature}><Lock size={13} aria-hidden="true" />{feature}</li>)}
                  </ul>
                </div>
              )}

              {plan.action === "free" ? (
                <Link className={`${styles.action} ${styles.freeAction}`} href="/signup">ابدأ مجاناً</Link>
              ) : (
                <CheckoutButton plan={plan.action} />
              )}
            </article>
          ))}
        </section>

        <div className={styles.note}><span className={styles.noteDot} aria-hidden="true" /> ابدأ مجاناً، ثم قم بالترقية عندما تحتاج أدوات النمو المتقدمة.</div>
      </main>
    </div>
  );
}
