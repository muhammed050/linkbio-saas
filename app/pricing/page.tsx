import Link from "next/link";
import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { MarketingHeader } from "@/components/public/marketing-header";

const plans = [
  { name: "Free", price: "$0", description: "لبداية بسيطة ومرتبة.", features: ["5 روابط", "قسمان", "قوالب أساسية", "صفحة متجاوبة"], action: "ابدأ مجاناً" },
  { name: "Pro", price: "$29", description: "للمبدعين الذين يريدون مساحة للنمو.", features: ["روابط وأقسام بلا حدود", "منتجات وخدمات بلا حدود", "نطاق مخصص", "تحليلات وQR وSEO", "إزالة علامة لينكا"], action: "pro" },
  { name: "Business", price: "$79", description: "للأعمال التي تحتاج سعة ودعماً أكبر.", features: ["كل مزايا Pro", "منتجات وخدمات بلا حدود", "نطاق مخصص", "تحليلات وQR وSEO", "دعم ذو أولوية"], action: "business" },
] as const;

export default function PricingPage() { return <div className="pricing-page"><MarketingHeader /><main id="main-content" className="pricing-main"><header className="pricing-heading"><p className="eyebrow">خطط واضحة</p><h1>اختر ما يناسب<br />مرحلتك التالية.</h1><p>ابدأ مجاناً، وارتقِ عندما تحتاج أدوات أكثر. الأسعار بالدولار الأمريكي شهرياً.</p></header><section className="pricing-grid" aria-label="خطط الاشتراك">{plans.map((plan) => <article className={`pricing-card ${plan.name === "Pro" ? "featured" : ""}`} key={plan.name}>{plan.name === "Pro" && <span className="plan-tag">الأكثر اختياراً</span>}<h2>{plan.name}</h2><p className="plan-description">{plan.description}</p><p className="plan-price"><strong>{plan.price}</strong>{plan.price !== "$0" && <span> / شهرياً</span>}</p><ul>{plan.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>{plan.action === "ابدأ مجاناً" ? <Link className="pricing-action" href="/signup">ابدأ مجاناً</Link> : <CheckoutButton plan={plan.action} />}</article>)}</section></main></div>; }
