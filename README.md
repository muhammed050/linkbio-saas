This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## النشر على Vercel

### المتغيرات المطلوبة (Environment Variables)

أضف المتغيرات التالية في إعدادات المشروع على Vercel (Settings → Environment Variables) قبل البناء — انسخ الأسماء من `.env.example` واملأ القيم الفعلية من بيئتك:

| المتغير | الوصف |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | أصل التطبيق العام، يجب أن يكون HTTPS خارج بيئة التطوير المحلية |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase (عام، يُحقن في حزمة العميل) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon العام لمشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service role — خادم فقط، لا تعرضه أبداً للعميل (مطلوب لعمليات الـ admin والفوترة والـ webhooks) |
| `WHOP_API_KEY` | مفتاح API الخاص بتكامل Whop (خادم فقط) |
| `WHOP_WEBHOOK_SECRET` | سر توقيع webhooks القياسية من Whop (خادم فقط) |
| `WHOP_PLAN_PRO` | معرف خطة Pro على Whop |
| `WHOP_PLAN_BUSINESS` | معرف خطة Business على Whop |
| `WHOP_REDIRECT_URL` | رابط HTTPS يُستخدم لإعادة التوجيه بعد الدفع عبر Whop — يشترط Whop أن يكون `https://`، وإلا يُرجع خطأ 502 عند بدء الدفع |

ملاحظة: متغيرات `NEXT_PUBLIC_*` تُحقن في الحزمة وقت البناء، لذا أي تغيير فيها يستلزم إعادة نشر.

### ربط المشروع

1. اربط مستودع المشروع على GitHub (أو أي مزود متوافق) بمنصة Vercel.
2. أنشئ مشروعاً جديداً وستتعرف Vercel تلقائياً على Next.js — اترك إعدادات البناء الافتراضية (`npm run build`).
3. أضف المتغيرات أعلاه في إعدادات المشروع ثم نفّذ أول نشر.
4. عيّن `NEXT_PUBLIC_SITE_URL` و `WHOP_REDIRECT_URL` على رابط النشر النهائي (`https://...`) بعد أول نشر.

### تنفيذ migrations

طبّق مخطط قاعدة البيانات قبل تفعيل الميزات التي تعتمد عليه:

- عبر CLI: من مجلد `supabase/` شغّل `supabase db push` (الـ migrations موجودة في `supabase/migrations`).
- أو عبر SQL Editor في لوحة تحكم Supabase: الصق محتوى ملفات الـ migrations و نفّذها بالترتيب.

### ضبط webhook Whop

1. أنشئ Webhook في لوحة تحكم Whop يوجّه إلى endpoint الفعلي في بيئة الإنتاج (Standard Webhooks).
2. ضع السر في `WHOP_WEBHOOK_SECRET` على Vercel.
3. تأكد من تعيين `WHOP_REDIRECT_URL` على `https://` ليكون متوافقاً مع اشتراطات Whop.
4. فعّل خطتي `WHOP_PLAN_PRO` و `WHOP_PLAN_BUSINESS` في لوحة Whop وضع معرفيهما في المتغيرات المقابلة.

