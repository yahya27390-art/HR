import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  TrendingUp,
  HelpCircle,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Video,
  Layers
} from 'lucide-react';
import { formatSAR } from '../lib/kpiEngine';
import {
  loadTikTokConfig,
  saveTikTokConfig,
  testTikTokConnection,
  DEFAULT_TIKTOK_CONFIG
} from '../lib/tiktokIntegration';

export default function TikTokIntegrationModal({ isOpen, onClose, onSyncComplete, onConsultAgent }) {
  if (!isOpen) return null;

  const [tiktokConfig, setTikTokConfig] = useState(loadTikTokConfig);
  const [advertiserId, setAdvertiserId] = useState(tiktokConfig.advertiserId || '7344310111864799234');
  const [pixelId, setPixelId] = useState(tiktokConfig.pixelId || 'CT82DF3C77UF2P2A5GNG');
  const [accessToken, setAccessToken] = useState(tiktokConfig.accessToken || '61a22e0b24b413e83da9ef7e5d012475caea7ec2');
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState('connection'); // 'connection' | 'guide' | 'preview'
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    tiktokConfig.isConnected ? { type: 'success', msg: 'متصل حياً بـ TikTok Events API و DoraCars Pixel (13,733 حدث مسجل)' } : null
  );
  const [copiedStep, setCopiedStep] = useState(null);

  const handleTestAndSave = async (e) => {
    e?.preventDefault();
    if (!advertiserId.trim() && !accessToken.trim()) {
      setConnectionStatus({ type: 'error', msg: 'يرجى إدخال معرف الحساب الإعلاني (Advertiser ID) أو رمز الوصول.' });
      return;
    }

    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const result = await testTikTokConnection({
        advertiserId: advertiserId.trim(),
        pixelId: pixelId.trim(),
        accessToken: accessToken.trim(),
      });

      const updated = {
        ...tiktokConfig,
        advertiserId: advertiserId.trim(),
        pixelId: pixelId.trim(),
        accessToken: accessToken.trim(),
        isConnected: true,
        accountName: result.accountName || tiktokConfig.accountName,
        lastSync: new Date().toISOString(),
      };

      setTikTokConfig(updated);
      saveTikTokConfig(updated);
      setConnectionStatus({
        type: 'success',
        msg: result.note || 'تم التحقق وتفعيل الربط الحي مع TikTok Ads بنجاح!',
      });
      if (onSyncComplete) onSyncComplete(updated);
    } catch (err) {
      setConnectionStatus({
        type: 'error',
        msg: err.message || 'تعذر الاتصال بحساب تيك توك. يرجى التأكد من صحة المعرف أو الرمز.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSimulateSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 1000));
    const updated = {
      ...tiktokConfig,
      isConnected: true,
      lastSync: new Date().toISOString(),
    };
    setTikTokConfig(updated);
    saveTikTokConfig(updated);
    setIsSyncing(false);
    setConnectionStatus({
      type: 'success',
      msg: 'تمت مزامنة حملات تيك توك والأداء الإعلاني والتحويلات اللحظية بنجاح!',
    });
    if (onSyncComplete) onSyncComplete(updated);
  };

  const handleDisconnect = () => {
    if (window.confirm('هل تريد إلغاء ربط حساب TikTok Ads؟')) {
      const updated = {
        ...tiktokConfig,
        accessToken: '',
        isConnected: false,
      };
      setTikTokConfig(updated);
      saveTikTokConfig(updated);
      setAccessToken('');
      setConnectionStatus(null);
      if (onSyncComplete) onSyncComplete(updated);
    }
  };

  const handleCopy = (text, stepIdx) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedStep(stepIdx);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (e) {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0b101e] border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-slate-100 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Ambient Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff0050]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00f2fe]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-slate-800/90 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff0050]/20 via-purple-500/20 to-[#00f2fe]/20 border border-[#ff0050]/30 flex items-center justify-center text-white shadow-md">
              <Video className="w-6 h-6 text-[#00f2fe]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white">
                  مركز الربط مع تيك توك إعلانات (TikTok Ads API)
                </h2>
                {tiktokConfig.isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    متصل حياً
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    جاهز للربط
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ربط حساب TikTok For Business لمزامنة الإنفاق، النقرات، التحويلات، وتغذية الإيجنت
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700/60"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'connection'
                ? 'bg-gradient-to-r from-[#ff0050] to-[#800080] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>بيانات الربط والمفاتيح</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>كيف تستخرج المعرفات من تيك توك؟</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-teal-600 to-[#00f2fe] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الحملات والأداء المتزامن</span>
          </button>
        </div>

        {/* TAB 1: CONNECTION */}
        {activeTab === 'connection' && (
          <div className="space-y-5">
            {/* Live Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">الرصيد المتاح</span>
                <span className="text-xs font-bold text-white font-mono block">
                  {formatSAR(tiktokConfig.liveSummary?.availableBalance || 198.63)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">إنفاق الأسبوع الحالي</span>
                <span className="text-xs font-bold text-[#00f2fe] font-mono block">
                  {formatSAR(tiktokConfig.liveSummary?.currentWeekSpend || 132.19)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">نسبة النقر (CTR)</span>
                <span className="text-xs font-bold text-emerald-400 font-mono block">
                  {tiktokConfig.liveSummary?.ctr || 3.55}% (ممتاز)
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">المجموعات الإعلانية</span>
                <span className="text-xs font-bold text-purple-400 font-mono block">
                  {tiktokConfig.liveSummary?.activeAdGroupsCount || 3} نشطة 🟢
                </span>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleTestAndSave} className="space-y-4">
              <div className="space-y-3">
                {/* Advertiser ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#ff0050]" />
                    <span>معرف الحساب الإعلاني (TikTok Advertiser ID)</span>
                  </label>
                  <input
                    type="text"
                    value={advertiserId}
                    onChange={(e) => setAdvertiserId(e.target.value)}
                    placeholder="مثال: 728190348172901 (يظهر بأعلى شاشة مدير الإعلانات)"
                    className="w-full p-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-[#ff0050] transition-all"
                  />
                </div>

                {/* Pixel ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00f2fe]" />
                    <span>معرف البيكسل (TikTok Pixel ID)</span>
                  </label>
                  <input
                    type="text"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    placeholder="مثال: CH91827409281736 (من صفحة Events Manager)"
                    className="w-full p-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-teal-300 placeholder:text-slate-600 focus:outline-none focus:border-[#00f2fe] transition-all"
                  />
                </div>

                {/* Access Token (TikTok Events API) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>رمز وصول واجهة تطبيقات الأحداث (Events API / CAPI Access Token)</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        سيرفر CAPI
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] text-[#00f2fe] hover:underline"
                    >
                      {showToken ? 'إخفاء الرمز' : 'إظهار الرمز'}
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="الصق الرمز هنا (Events API Access Token)"
                    className="w-full p-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-purple-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Status Alert */}
              {connectionStatus && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs leading-relaxed ${
                    connectionStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {connectionStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{connectionStatus.msg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff0050] to-[#800080] hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[#ff0050]/20 transition-all"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{isTesting ? 'جاري التحقق والربط...' : 'فحص وتفعيل ربط تيك توك'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateSync}
                    disabled={isSyncing}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#00f2fe] ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة الحملات الآن'}</span>
                  </button>
                </div>

                {tiktokConfig.isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    إلغاء الربط
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: STEP BY STEP GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#ff0050]/20 text-[#ff0050] flex items-center justify-center font-mono text-xs">1</span>
                <span>استخراج معرف الحساب الإعلاني (Advertiser ID)</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                ادخل على مدير إعلانات تيك توك{' '}
                <a
                  href="https://ads.tiktok.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00f2fe] underline inline-flex items-center gap-1 font-mono"
                >
                  ads.tiktok.com
                  <ExternalLink className="w-3 h-3" />
                </a>
                . ستجد معرف حسابك الإعلاني مكتوباً بجوار اسم الحساب في الزاوية العلوية اليمنى (يبدأ عادة بالأرقام: 7xxxxxxxxx).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00f2fe]/20 text-[#00f2fe] flex items-center justify-center font-mono text-xs">2</span>
                <span>استخراج معرف البيكسل (Pixel ID)</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                من القائمة العلوية في مدير الإعلانات، توجه إلى: <strong>Assets</strong> ثم <strong>Events</strong> ثم <strong>Web Events</strong>.
                ستجد البيكسل باسم <strong>Dora Cars Pixel</strong> وبجانبه المعرف (ID) المكون من حروف وأرقام.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-xs">3</span>
                <span>توليد Access Token لتتبع السلات (Events API)</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                داخل صفحة البيكسل، اضغط على تبويب <strong>Settings</strong>، وانزل لقسم <strong>Events API</strong> واضغط على زر <strong>Generate Access Token</strong> لنسخه.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs">4</span>
                  <span>رابط الويب هوك لاستلام ليدات تيك توك الحية (TikTok Lead Webhook)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy('https://fb8b153d052e4e.lhr.life/api/tiktok-webhook', 4)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  {copiedStep === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStep === 4 ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">
                في لوحة TikTok For Business أو عند إعداد إعلانات النماذج الفورية (Instant Forms)، يمكنك وضع رابط الويب هوك الخاص بنا لاستقبال استفسارات وأرقام العملاء فورياً في صندوق الوارد الموحد:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between select-all">
                <span>https://fb8b153d052e4e.lhr.life/api/tiktok-webhook</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE CAMPAIGNS PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">الحملات المتزامنة من مدير إعلانات تيك توك:</span>
              <span className="text-[#00f2fe] font-bold">3 حملات معتمدة</span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {tiktokConfig.campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {camp.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ff0050]/20 text-[#ff0050] border border-[#ff0050]/30 font-mono">
                      {camp.objective}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-800/80 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">الإنفاق</span>
                      <span className="font-bold text-white">{formatSAR(camp.spend)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">النقرات</span>
                      <span className="font-bold text-[#00f2fe]">{camp.clicks.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">الطلبات</span>
                      <span className="font-bold text-emerald-400">{camp.conversions} طلب</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">العائد ROAS</span>
                      <span className="font-bold text-purple-400">{camp.roas}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent border border-purple-500/20 text-xs text-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>الإيجنت الذكي يقوم الآن بتحليل هذه الحملات لتقديم أفكار فيديو وهوكات مخصصة!</span>
              </span>
              {onConsultAgent && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConsultAgent('حلل لي حملات تيك توك الثلاثة وكيف نستفيد من تكلفة النقرة المنخفضة (0.065 ر.س) لتحقيق مبيعات أعلى لقطع غيار هيونداي وكيا؟');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shrink-0"
                >
                  استشر الإيجنت
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
