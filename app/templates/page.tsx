import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { MarketingHeader } from "@/components/public/marketing-header";
import { templates } from "@/components/public/template-data";

export const metadata: Metadata = { title: "قوالب لينكا | صفحات تعريفية عربية", description: "استكشف قوالب صفحات التعريف العربية القابلة للتخصيص من لينكا." };

export default function TemplatesPage() { return <div className="marketing-page"><MarketingHeader /><main id="main-content" className="gallery-main"><header className="gallery-heading"><p className="eyebrow">قوالب جاهزة للانطلاق</p><h1>صفحة تشبهك،<br />من أول رابط.</h1><p>ثمانية تركيبات حقيقية للمبدعين والمتاجر والأعمال والضيافة، لا مجرد ألوان مختلفة.</p></header><section className="template-grid" aria-label="معرض القوالب">{templates.map((template) => <article className="template-card" key={template.id}><div className={`template-preview preview-${template.layout} theme-${template.theme}`} dir={template.direction ?? "rtl"}><div className="preview-media" /><div className="preview-avatar">{template.avatar}</div><b>{template.title}</b><small>{template.handle}</small><div className="preview-lines"><i /><i /><i /></div></div><div className="template-card-body"><span>{template.category}</span><h2>{template.name}</h2><Link href={`/${template.id}`}>معاينة القالب <ArrowUpLeft size={16} aria-hidden="true" /></Link></div></article>)}</section></main></div>; }
