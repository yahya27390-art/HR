import React from 'react';
import { Shield, ArrowRight, Lock, Eye, CheckCircle2, Mail, Phone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#070c18] text-slate-200 font-sans p-6 sm:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#0d162a] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">سياسة الخصوصية وحماية البيانات</h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">شركة درة السيارة لقطع غيار السيارات | Dora Cars Platform</p>
            </div>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700"
          >
            <span>العودة للمنصة</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* Policy Statement */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              1. مقدمة ونطاق السياسة
            </h2>
            <p>
              تحرص <strong>«شركة درة السيارة لقطع غيار السيارات»</strong> (المشار إليها بـ «الشركة» أو «نحن») على حماية خصوصية وبيانات عملائها وزوارها وفقاً للأنظمة واللوائح المعمول بها في المملكة العربية السعودية ومعايير حماية البيانات العالمية لمنصات Meta (Facebook & Instagram) و TikTok.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              2. البيانات التي يتم جمعها والغرض منها
            </h2>
            <p>
              يقوم نظام خدمة العملاء ومنصة الربط الذكية بجمع ومعالجة البيانات الضرورية فقط لتقديم خدمات تسعير وتوفير قطع الغيار:
            </p>
            <ul className="list-disc list-inside space-y-1 pr-3 text-slate-300">
              <li><strong>بيانات المراسلة:</strong> نصوص الرسائل والاستفسارات الواردة عبر منصات Meta (Facebook Messenger و Instagram Direct) وتيك توك لتقديم الرد الآلي وتوجيه العميل للفرع المناسب (كيا أو هيونداي أو المتجر).</li>
              <li><strong>معلومات السيارة والطلب:</strong> نوع وموديل السيارة، سنة الصنع، اسم القطعة المطلوبة، ورقم الهيكل (VIN) لتأكيد التوافق الدقيق لقطع الغيار.</li>
              <li><strong>بيانات الاتصال:</strong> الاسم المعرف ورقم الجوال في حال قام العميل بتزويدنا به لمتابعة الطلب أو الشحن.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              3. الامتثال لمعايير منصتي Meta و TikTok
            </h2>
            <p>
              نلتزم بصرامة بسياسات المطورين (Platform Terms & Developer Policies) الخاصة بشركتي Meta و TikTok:
            </p>
            <ul className="list-disc list-inside space-y-1 pr-3 text-slate-300">
              <li>لا يتم بيع أو مشاركة أو تأجير أي بيانات تخص مراسلات العملاء مع أي طرف ثالث لأغراض إعلانية أو تجارية.</li>
              <li>تُستخدم واجهات التطبيقات البرمجية الرسمية فقط (Official APIs & Webhooks) لضمان التشفير والأمان التام.</li>
              <li>لا نقوم بتوليد أو تخزين أي أسماء أو بيانات وهمية داخل أنظمتنا.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              4. أمن وتخزين البيانات
            </h2>
            <p>
              يتم تشفير جميع الاتصالات والبيانات أثناء النقل باستخدام بروتوكول التشفير الآمن (TLS / HTTPS). وتخضع الخوادم لإجراءات حماية صارمة تمنع أي وصول غير مصرح به.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              5. حقوق العميل وحذف البيانات (Data Deletion)
            </h2>
            <p>
              يحق للعميل في أي وقت طلب مراجعة بياناته أو حذفها بالكامل من سجلاتنا فوراً. للاطلاع على آلية حذف البيانات، يرجى مراجعة{' '}
              <Link to="/data-deletion" className="text-teal-400 underline font-bold">صفحة تعليمات حذف البيانات (Data Deletion Instructions)</Link>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              6. معلومات التواصل الرسمية
            </h2>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <p><strong>شركة درة السيارة لقطع غيار السيارات</strong></p>
              <p>المملكة العربية السعودية - القصيم / بريدة</p>
              <p>الموقع الإلكتروني: <a href="https://doracars.com" target="_blank" rel="noreferrer" className="text-teal-400 underline font-mono">https://doracars.com</a></p>
              <p>هاتف الدعم والمتجر: 0538834212 | 0539454377 | 0530051360</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 text-center text-slate-500 text-xs">
          آخر تحديث: سبتمبر 2026 | سارية ومعتمدة رسمياً لربط منصات التواصل وإدارة المحادثات
        </div>

      </div>
    </div>
  );
}
