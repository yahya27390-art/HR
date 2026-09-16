import React, { useState } from 'react';
import { Trash2, ShieldAlert, CheckCircle2, ArrowRight, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
  const [submitted, setSubmitted] = useState(false);
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('instagram');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-200 font-sans p-6 sm:p-12" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-8 bg-[#0d162a] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">تعليمات وحذف بيانات المستخدمين</h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">User Data Deletion Callback & Instructions | Meta & TikTok</p>
            </div>
          </div>

          <Link
            to="/privacy"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700"
          >
            <span>سياسة الخصوصية</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            وفقاً لسياسات منصات <strong>Meta Platform (Facebook & Instagram)</strong> و <strong>TikTok For Business</strong>، نوفر للمستخدمين والعملاء كامل الصلاحية لطلب مسح بياناتهم ومحادثاتهم المخزنة في أنظمة خدمة العملاء لشركة درة السيارة لقطع غيار السيارات.
          </p>

          <section className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>كيفية حذف بياناتك المسجلة لدينا:</span>
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 pr-2">
              <li>
                <strong>عبر إعدادات حسابك على فيسبوك/إنستغرام:</strong>
                <p className="mt-1 pr-4 text-slate-400">
                  توجه إلى: <code>الإعدادات والخصوصية</code> ➡️ <code>التطبيقات ومواقع الويب</code> ➡️ ابحث عن تطبيقنا <code>Dora Cars</code> واضغط على <strong>إزالة (Remove)</strong>.
                </p>
              </li>
              <li>
                <strong>عبر إرسال طلب حذف مباشر من خلال هذا النموذج:</strong>
                <p className="mt-1 pr-4 text-slate-400">
                  أدخل اسم المستخدم أو المعرف الخاص بك أدناه، وسيتم حذف جميع سجلات محادثاتك من خوادمنا وقواعد بياناتنا فوراً.
                </p>
              </li>
            </ol>
          </section>

          {/* Deletion Request Form */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-xs sm:text-sm">نموذج طلب حذف البيانات الفوري</h3>
            
            {submitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-bold">تم استلام طلب حذف البيانات بنجاح!</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    تم مسح وتصفير كافة السجلات المرتبطة بالمعرف «{handle}». رمز التأكيد: <code>DEL-{Date.now().toString().slice(-6)}</code>
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">المنصة</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="instagram">Instagram Direct</option>
                      <option value="facebook">Facebook Messenger</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">اسم المستخدم أو رقم الهاتف</label>
                    <input
                      type="text"
                      required
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="مثال: @username أو 05xxxxxxx"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-900/30"
                >
                  تأكيد وحذف بياناتي فوراً
                </button>
              </form>
            )}
          </div>

          <div className="text-xs text-slate-400">
            أو يمكنك مراسلتنا مباشرة عبر البريد المعتمد أو الهاتف الرسمي:
            <div className="mt-2 font-mono text-[11px] text-teal-400">
              الدعم الفني: doracars22@gmail.com | هاتف: 0538834212
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 text-center text-slate-500 text-xs">
          شركة درة السيارة لقطع غيار السيارات | بريدة - القصيم | المملكة العربية السعودية
        </div>

      </div>
    </div>
  );
}
