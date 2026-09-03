import Link from "next/link";
import { ArrowUpLeft, CalendarDays, Mail, MapPin, Phone, Play, ShoppingBag } from "lucide-react";
import type { LinkIcon, LinkItem, PublicSection, PublicTemplate } from "./template-data";

const icons: Record<LinkIcon, typeof ArrowUpLeft> = { arrow: ArrowUpLeft, mail: Mail, play: Play, calendar: CalendarDays, phone: Phone, map: MapPin, bag: ShoppingBag };

function LinkRow({ item }: { item: LinkItem }) {
  const Icon = icons[item.icon];
  return <a className="profile-link" href={item.href}><span><strong>{item.label}</strong>{item.note && <small>{item.note}</small>}</span><Icon aria-hidden="true" size={18} /></a>;
}

export function Section({ section }: { section: PublicSection }) {
  if (section.type === "links") return <section className="profile-section">{section.title && <h2>{section.title}</h2>}<div className="profile-links">{section.items.map((item) => <LinkRow item={item} key={item.label} />)}</div></section>;
  if (section.type === "quote") return <blockquote className="profile-quote"><p>“{section.text}”</p>{section.author && <footer>{section.author}</footer>}</blockquote>;
  if (section.type === "stats") return <section className="profile-stats" aria-label="إحصاءات">{section.items.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</section>;
  if (section.type === "newsletter") return <section className="profile-newsletter"><h2>{section.title}</h2><p>{section.copy}</p><a href="mailto:hello@linka.example.com">اشترك عبر البريد <Mail size={15} aria-hidden="true" /></a></section>;
  if (section.type === "hours") return <section className="profile-hours"><h2>{section.title}</h2><dl>{section.items.map((item) => <div key={item.day}><dt>{item.day}</dt><dd>{item.time}</dd></div>)}</dl></section>;
  return <section className="profile-products"><h2>{section.title}</h2><div>{section.items.map((item) => <a href="https://wa.me/966500000000" key={item.name}><span className="profile-product-image" aria-hidden="true" style={{ backgroundImage: `url(${item.image})` }} /><span><strong>{item.name}</strong><small>{item.detail}</small><b>{item.price}</b></span><ShoppingBag aria-hidden="true" size={17} /></a>)}</div></section>;
}

function ProfileHeader({ template }: { template: PublicTemplate }) {
  return <header className="profile-header">{template.heroImage && <div className="profile-hero-image" aria-hidden="true" style={{ backgroundImage: `url(${template.heroImage})` }} />}<div className="profile-avatar" aria-hidden="true">{template.avatar}</div><div className="profile-intro"><p>{template.handle}</p><h1>{template.title}</h1>{template.location && <span className="profile-location"><MapPin size={14} aria-hidden="true" />{template.location}</span>}<p className="profile-bio">{template.bio}</p></div></header>;
}

function TemplateContent({ template }: { template: PublicTemplate }) {
  const sections = template.sections.map((section, index) => <Section section={section} key={`${section.type}-${index}`} />);
  if (template.layout === "bento") return <div className="profile-content bento-content">{sections}</div>;
  return <div className="profile-content">{sections}</div>;
}

export function TemplatePage({ template }: { template: PublicTemplate }) {
  return <main id="main-content" className={`profile-page theme-${template.theme} layout-${template.layout}`} dir={template.direction ?? "rtl"}>
    <Link className="profile-brand" href="/" aria-label="العودة إلى لينكا">لينكا<span>·</span></Link>
    <div className="profile-shell"><ProfileHeader template={template} /><TemplateContent template={template} /><footer className="profile-footer">صُنع عبر <Link href="/">لينكا</Link></footer></div>
  </main>;
}
