import React from 'react';
import { FileText, ArrowRight, CheckCircle2, ShieldCheck, Scale, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#070c18] text-slate-200 font-sans p-6 sm:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#0d162a] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">شروط وأحكام الخدمة (Terms of Service)</h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">شركة درة السيارة لقطع غيار السيارات | Dora Cars Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/privacy"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all border border-slate-700"
            >
              سياسة الخصوصية
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20"
            >
              <span>المنصة</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              1. القبول بالشروط
            </h2>
            <p>
              باستخدامك لمنصة وخدمات <strong>«شركة درة السيارة لقطع غيار السيارات»</strong> أو تفاعلك عبر قنواتنا المعتمدة على منصات <strong>Meta (Instagram و Facebook)</strong> أو <strong>TikTok</strong>، فإنك توافق التام وغير المشروط على الالتزام بهذه الشروط والأحكام وسياسة الخصوصية الخاصة بنا.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              2. وصف الخدمات
            </h2>
            <p>
              توفر المنصة حلولاً رقمية لإدارة طلبات واستفسارات قطع غيار السيارات (كيا، هيونداي، وغيرها)، بما يشمل:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pr-3 text-slate-300">
              <li>الاستعلام الفوري عن توفر وأسعار قطع الغيار الأصلية والبديلة المعتمدة.</li>
              <li>التحقق من التوافق الهندسي للقطع عبر رقم الهيكل (VIN) أو رقم القطعة (Part Number).</li>
              <li>الربط المباشر مع مستودعات وفروع شركة درة السيارة بالمملكة العربية السعودية لتوجيه الطلبات والشحن.</li>
              <li>خدمة عملاء تفاعلية آلية وبشرية لاستقبال رسائل واستفسارات منصات التواصل الاجتماعي.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              3. الامتثال لسياسات المنصات الخارجية (Meta & TikTok)
            </h2>
            <p>
              تلتزم شركة درة السيارة لقطع غيار السيارات التزاماً كاملاً بـ:
            </p>
            <ul className="list-disc list-inside space-y-1 pr-3 text-slate-300">
              <li>شروط وسياسات مطوري Meta Platform Terms و Instagram Messaging Terms.</li>
              <li>سياسات TikTok for Business و Commercial Developer Terms.</li>
              <li>استخدام واجهات المراسلة حصرياً لخدمة العملاء الشرعية والرد على استفسارات قطع الغيار، مع حظر الرسائل المزعجة (Spam) أو غير المرغوب فيها قطعياً.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              4. سياسة التسعير والطلبات والضمان
            </h2>
            <p>
              جميع عروض الأسعار الصادرة عبر المراسلة تخضع لتوفر المخزون في الفروع وقت تأكيد الطلب الفعلي. تضمن الشركة مطابقة القطع الأصلية للعلامات المصنعة المعتمدة وفقاً للأنظمة واللوائح التجارية في المملكة العربية السعودية وحماية المستهلك.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              5. حماية البيانات والملكية الفكرية
            </h2>
            <p>
              جميع العلامات التجارية وحقوق الملكية الخاصة بدرة السيارة هي ملكية حصرية للشركة. كافة البيانات المعالجة عبر النظام يتم تشفيرها واستخدامها فقط لغرض إتمام المعاملات وخدمة العميل وفق سياسة الخصوصية.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              6. القانون الواجب التطبيق
            </h2>
            <p>
              تخضع هذه الشروط والأحكام وتفسر وفقاً للقوانين والأنظمة المعمول بها في المملكة العربية السعودية وتختص المحاكم السعودية بالنظر في أي نزاع ينشأ عنها.
            </p>
          </section>

          {/* Contact Details */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <p className="font-bold text-slate-200">شركة درة السيارة لقطع غيار السيارات</p>
              <p>المملكة العربية السعودية | الرياض</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span dir="ltr">+966 55 050 9188</span>
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>support@doracars.com</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
