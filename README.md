# سكاي كلر — نظام CRM متعدد الفروع

نظام إدارة العملاء الداخلي لشركة سكاي كلر لتجارة السيارات.

## المميزات

- 🏢 **11 فرع** مع صلاحيات مستقلة لكل فرع
- 👥 **3 أدوار**: إدارة عليا، مالك الفرع، مندوب مبيعات
- 📋 **تتبع العملاء** من أول تواصل حتى إتمام البيع
- ⚠️ **تنبيهات المتابعة** للعملاء المتأخرة (أكثر من 3 أيام)
- 📊 **لوحات تحكم** مع رسوم بيانية تفاعلية
- 🔒 **RLS** على مستوى قاعدة البيانات (Supabase Row Level Security)
- 🌐 **عربي RTL** بالكامل

## التقنيات

- **Frontend**: React + Vite
- **Backend/DB**: Supabase (Postgres + Auth + RLS)
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Deployment**: Netlify

## مراحل الـ Pipeline

1. `lead_in` — عميل جديد (رسالة/زيارة)
2. `contacted` — تم التواصل
3. `interested` — مهتم ومؤهل
4. `showroom_visit` — معاينة/تجربة قيادة
5. `quote_sent` — عرض سعر (نقطة التحويل لـ Odoo)
6. `negotiation` — تفاوض
7. `closed_won` — تم البيع ✅
8. `closed_lost` — فقد ❌

## الإعداد

### 1. Supabase

1. أنشئ مشروعاً جديداً في [supabase.com](https://supabase.com)
2. شغّل الكود الموجود في `supabase/schema.sql` في **SQL Editor**
3. أضف مستخدمين عبر Supabase Auth → Users، ثم أضف بياناتهم في جدول `user_profiles`

### 2. متغيرات البيئة

```bash
cp .env.example .env
```

عدّل `.env` وأضف بيانات مشروع Supabase الخاص بك:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. تشغيل محلي

```bash
npm install
npm run dev
```

### 4. النشر على Netlify

1. ارفع الكود على GitHub
2. أنشئ موقعاً جديداً في Netlify واربطه بالـ repo
3. أضف متغيرات البيئة في Netlify → Site Settings → Environment Variables
4. النشر يتم تلقائياً

## إضافة مستخدم جديد

1. **Supabase Auth**: أنشئ المستخدم (Email + Password)
2. **جدول `user_profiles`**: أضف صفاً بـ:
   - `id`: نفس UUID من Auth
   - `name`: الاسم
   - `role`: `helicopter` أو `branch_owner` أو `rep`
   - `branch_id`: UUID الفرع (اتركه NULL للـ helicopter)

## الأدوار والصلاحيات

| الدور | الصلاحية |
|-------|----------|
| `helicopter` | قراءة كاملة لكل الفروع، بدون تعديل |
| `branch_owner` | قراءة فرعه فقط |
| `rep` | قراءة وكتابة كاملة في فرعه |
