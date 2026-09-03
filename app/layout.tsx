import type { Metadata } from 'next'
import { Cairo, Geist, Geist_Mono, Tajawal } from 'next/font/google'
import './globals.css'
import './profile-editor.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const cairo = Cairo({ variable: '--font-arabic', subsets: ['arabic', 'latin'] })
const tajawal = Tajawal({ variable: '--font-tajawal', subsets: ['arabic', 'latin'], weight: ['400', '500', '700', '800'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
export const metadata: Metadata = { ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}), title: { default: 'لينكا | رابطك، كما يجب أن يكون', template: '%s' }, description: 'لينكا: منصة عربية لإنشاء صفحة تعريف جميلة تجمع روابطك وأعمالك وقصتك في مكان واحد.', openGraph: { type: 'website', locale: 'ar_SA', siteName: 'لينكا', title: 'لينكا | رابطك، كما يجب أن يكون', description: 'صفحة تعريف عربية جميلة لكل ما تمثّله.' }, robots: { index: true, follow: true } }
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${tajawal.variable} h-full antialiased`} suppressHydrationWarning><body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-arabic), var(--font-tajawal), Arial, sans-serif' }}><a className="skip-link" href="#main-content">انتقل إلى المحتوى الرئيسي</a>{children}</body></html> }
