# Strict Rule: Mandatory Cybersecurity & Defensive Engineering (خطة التحصينات والمعايير الأمنية الإلزامية)

## Rule Description
**تُعتبر هذه القواعد مرجعاً أمنياً ثابتاً وإلزامياً غير قابل للنقاش في جميع المشاريع الحالية، السابقة، والجديدة. يُمنع منعاً باتاً التهاون في تطبيق معايير الأمان الدفاعي (Defensive Engineering) حتى لو كان المطلوب مجرد نموذج أولي أو برمجة سريعة (Vibe Coding).**

---

## Binding Security Directives (التوجيهات الأمنية الإلزامية):

### 1. الحظر التام لكتابة الأسرار والمفاتيح في كود العميل (Absolute Zero-Secrets in Frontend & Client Bundles):
- **يُمنع منعاً باتاً ومطلقاً** تضمين أي API Keys، Tokens (Meta Graph API, OpenAI, Anthropic, Supabase service_role, Cloudflare API tokens)، Passwords، أو Database URIs داخل كود الفرونت إند (React, Vue, HTML/JS) أو في ملفات تُرفع على Git.
- يجب توجيه جميع الطلبات الحساسة عبر خادم خلفي آمن أو وظيفة سحابية (Backend / Serverless Function / Cloudflare Worker).
- يجب حفظ الأسرار في متغيرات البيئة السرية للخادم (`Cloudflare Secrets` أو `.env` غير مرفوع) واستدعاؤها عبر `env.SECRET_NAME`.

### 2. منع بوابات الأمان الظاهرية فقط (Enforce Server-Side Auth & Ban Client-Only Gates):
- يُمنع الاعتماد على حماية ظاهرية فقط في الفرونت إند (مثل إخفاء الأزرار، أو التحقق من `localStorage` / `sessionStorage`، أو فحص PIN بكلمات مرور مكتوبة نصياً في ملفات JS مثل `pin === '7799'`).
- أي رمز مرور أو بوابة أمان إدارية (مثل بوابة المالك Owner Gate) يجب:
  1. أن يتم تشفيرها محلياً بتجزئة مشفرة معقدة (`SHA-256` أو `bcrypt` مع Salt) على أقل تقدير، بحيث لا تظهر الكلمة الأصلية في الكود نهائياً.
  2. في الأنظمة الإنتاجية الكاملة، يجب أن يتم التحقق من الصلاحيات عبر Server-Side Token / Session موثق من الباك إند.

### 3. تأمين منافذ الـ Webhooks والـ APIs والـ Rate Limiting:
- تقييد سياسة الـ CORS (Cross-Origin Resource Sharing) على النطاقات الرسمية المعتمدة فقط (حظر `*` في أي منافذ تقبل طلبات أو بيانات حساسة).
- تفعيل آليات الـ Rate Limiting وحدود الاستخدام لمنع هجمات حجب الخدمة (DDoS)، استنزاف الحصص والرصيد (API Quota Drainage)، أو هجمات التخمين الآلية (Brute-Force).
- التحقق الإلزامي من توقيع الرسائل (HMAC / Signature Verification) لجميع أحداث الـ Webhooks الواردة من منصات خارجية (Meta, Stripe, WhatsApp) لضمان عدم تزوير الطلبات.

### 4. حماية ملفات التصدير والتعقيم الشامل (Anti-Formula Injection & Data Sanitization):
- عند تصدير البيانات إلى جداول Excel أو ملفات CSV، يجب تطبيق دالة تعقيم (Sanitization) تمنع ثغرة الـ CSV/Formula Injection، وذلك بإلغاء أو معالجة أي نص يبدأ برموز تشغيل الصيغ الحسابية (`=`, `+`, `-`, `@`) لمنع تنفيذ أكواد خبيثة على أجهزة المستخدمين عند فتح الملف في Microsoft Excel.
- تعقيم جميع مدخلات البحث والنماذج ضد ثغرات الـ XSS وحقن الاستعلامات.

### 5. الامتثال لأنظمة حماية البيانات والخصوصية (PDPL & Privacy Compliance):
- الامتثال الصارم لنظام حماية البيانات الشخصية السعودي (PDPL) والأنظمة ذات الصلة.
- عدم تخزين أرقام الهواتف أو سجلات المحادثات الحساسة بدون تشفير وضوابط وصول دقيقة.
- الالتزام الدائم بقاعدة منع البيانات الوهمية والمصطنعة (Real Authenticated Data Only).

### 6. الفحص الدوري للاعتماديات والحزم (Automated Dependency & Vulnerability Auditing):
- فحص دوري للحزم والاعتماديات باستخدام `npm audit` لمعالجة أي ثغرات برمجية معروفة في المكتبات الخارجية قبل النشر.
