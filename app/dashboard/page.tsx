import Link from 'next/link'
import { ArrowUpLeft, BarChart3, CheckCircle2, Crown, ExternalLink, Eye, LayoutDashboard, Link2, Menu, Rocket, Settings, Sparkles } from 'lucide-react'
import { PageActions } from '@/components/dashboard/page-actions'
import { withAuth } from '@/lib/auth/protected'
import { PLAN_INFO } from '@/lib/billing/plans'
import { getAnalytics } from '@/lib/db/analytics'
import { getPage } from '@/lib/db/pages'

const planNames = { free: 'مجاني', pro: 'Pro', business: 'Business' } as const

export default async function DashboardPage() {
  return withAuth(async (user, profile) => {
    const page = await getPage(profile.id)
    const analytics = page ? await getAnalytics(page.id) : null
    const isPublished = page?.is_published === true
    const planInfo = PLAN_INFO[profile.plan_type]
    const publicPath = `/${profile.username}`
    const metrics = analytics ? [
      { label: 'زيارات الصفحة', value: analytics.page_views, icon: Eye },
      { label: 'نقرات الروابط', value: analytics.link_clicks, icon: Link2 },
      { label: 'إجمالي التفاعلات', value: analytics.total_events, icon: BarChart3 },
    ] : []

    return <div className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="التنقل الرئيسي">
        <Link className="wordmark dashboard-wordmark" href="/">لينكا<span>·</span></Link>
        <nav className="dashboard-nav">
          <Link className="dashboard-nav-item active" href="/dashboard" aria-current="page"><LayoutDashboard aria-hidden="true" size={18} />نظرة عامة</Link>
          <Link className="dashboard-nav-item" href="/dashboard/edit"><Settings aria-hidden="true" size={18} />تعديل الصفحة</Link>
          <Link className="dashboard-nav-item" href="/pricing"><Crown aria-hidden="true" size={18} />الباقة والفوترة</Link>
        </nav>
        <div className="dashboard-sidebar-footer"><span className="dashboard-avatar" aria-hidden="true">{(profile.full_name || profile.username).slice(0, 1)}</span><div><strong>{profile.full_name || profile.username}</strong><span dir="ltr">{user.email}</span></div></div>
      </aside>
      <header className="dashboard-mobile-header">
        <Link className="wordmark" href="/">لينكا<span>·</span></Link>
        <details className="dashboard-mobile-menu"><summary aria-label="فتح قائمة التنقل"><Menu aria-hidden="true" size={21} /></summary><nav aria-label="التنقل الرئيسي"><Link href="/dashboard" aria-current="page">نظرة عامة</Link><Link href="/dashboard/edit">تعديل الصفحة</Link><Link href="/pricing">الباقة والفوترة</Link></nav></details>
      </header>
      <main id="main-content" className="dashboard-main">
        <header className="dashboard-intro"><div><p className="eyebrow">مساحتك الخاصة</p><h1>أهلاً، {profile.full_name || profile.username}</h1><p>تحكم بصفحتك وروابطك ومحتواك من مكان واحد.</p></div><Link className="dashboard-primary-link" href="/dashboard/edit"><Settings aria-hidden="true" size={18}/>تعديل الصفحة</Link></header>
        <section className="dashboard-overview-grid" aria-label="ملخص الصفحة والحساب">
          <article className="dashboard-card dashboard-page-card"><div className="dashboard-card-heading"><div><span className={`dashboard-status ${isPublished ? 'published' : 'draft'}`}><CheckCircle2 aria-hidden="true" size={15}/>{isPublished ? 'منشورة' : 'غير منشورة'}</span><h2>{page?.title || 'لم تُنشأ صفحة بعد'}</h2></div><Sparkles aria-hidden="true" size={23}/></div>{page ? <><p className="dashboard-card-description">{isPublished ? 'صفحتك متاحة للزوار عبر الرابط العام.' : 'الصفحة محفوظة كمسودة وليست متاحة للزوار بعد.'}</p>{isPublished && <><a className="dashboard-public-url" href={publicPath} target="_blank" rel="noreferrer" dir="ltr">{publicPath}<ExternalLink aria-hidden="true" size={15}/></a><PageActions path={publicPath} title={page.title}/></>}</> : <p className="dashboard-card-description">ابدأ بإنشاء صفحتك ثم أضف روابطك ومحتواك.</p>}</article>
          <article className="dashboard-card dashboard-plan-card"><div className="dashboard-card-heading"><div><p className="dashboard-card-kicker">الباقة الحالية</p><h2>{planNames[profile.plan_type]}</h2></div><Crown aria-hidden="true" size={23}/></div><p className="dashboard-card-description">{planInfo.features.slice(0, 2).join(' · ')}</p><Link className="dashboard-text-link" href="/pricing">عرض الباقات <ArrowUpLeft aria-hidden="true" size={16}/></Link></article>
        </section>
        <section className="dashboard-section" aria-labelledby="quick-actions-heading"><div className="dashboard-section-heading"><div><p className="eyebrow">ابدأ من هنا</p><h2 id="quick-actions-heading">إجراءات سريعة</h2></div></div><div className="dashboard-quick-grid"><Link className="dashboard-quick-action" href="/dashboard/edit"><Settings aria-hidden="true" size={20}/><strong>تعديل الصفحة</strong><span>غيّر الهوية والأقسام والروابط والمنتجات والخدمات.</span><ArrowUpLeft aria-hidden="true" size={17}/></Link><Link className="dashboard-quick-action" href="/pricing"><Crown aria-hidden="true" size={20}/><strong>ترقية الباقة</strong><span>استكشف المزايا والحدود المتاحة لكل خطة.</span><ArrowUpLeft aria-hidden="true" size={17}/></Link>{isPublished ? <a className="dashboard-quick-action" href={publicPath} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={20}/><strong>معاينة الصفحة</strong><span>افتح صفحتك العامة في تبويب جديد.</span><ArrowUpLeft aria-hidden="true" size={17}/></a> : <Link className="dashboard-quick-action" href="/dashboard/edit"><Rocket aria-hidden="true" size={20}/><strong>انشر صفحتك</strong><span>أكمل إعداد الصفحة ثم انشرها عندما تصبح جاهزة.</span><ArrowUpLeft aria-hidden="true" size={17}/></Link>}</div></section>
        <section className="dashboard-section" aria-labelledby="analytics-heading"><div className="dashboard-section-heading"><div><p className="eyebrow">آخر 30 يوماً</p><h2 id="analytics-heading">ملخص التحليلات</h2></div>{analytics && <span className="dashboard-data-note">بيانات فعلية</span>}</div>{!page ? <div className="dashboard-empty-state"><BarChart3 aria-hidden="true" size={24}/><div><h3>لا توجد صفحة لتحليلها بعد</h3><p>ستظهر البيانات هنا بعد إنشاء صفحة وتلقي زيارات عليها.</p></div></div> : analytics?.total_events === 0 ? <div className="dashboard-empty-state"><BarChart3 aria-hidden="true" size={24}/><div><h3>لا توجد تفاعلات مسجلة بعد</h3><p>ستظهر زيارات الصفحة ونقرات الروابط هنا عند تسجيلها.</p></div></div> : <div className="dashboard-metrics">{metrics.map(({label,value,icon:Icon})=><article className="dashboard-metric" key={label}><Icon aria-hidden="true" size={19}/><span>{label}</span><strong>{new Intl.NumberFormat('ar-SA').format(value)}</strong></article>)}</div>}</section>
      </main>
    </div>
  })
}
