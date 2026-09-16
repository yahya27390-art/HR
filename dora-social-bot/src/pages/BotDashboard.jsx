import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Radio, Shield, Settings, Sliders,
  RefreshCw, CheckCircle2, AlertCircle, Bot, Share2,
  ExternalLink, Sparkles, Phone, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import OmnichannelInboxView from '../components/OmnichannelInboxView';
import TikTokIntegrationModal from '../components/TikTokIntegrationModal';
import MetaIntegrationModal from '../components/MetaIntegrationModal';
import { loadMetaConfig } from '../lib/metaIntegration';
import { loadTikTokConfig } from '../lib/tiktokIntegration';

export default function BotDashboard() {
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [metaConfig, setMetaConfig] = useState(getMetaConfig());
  const [tiktokConfig, setTiktokConfig] = useState(getTikTokConfig());

  // Check live server health
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('http://localhost:3005/api/ping');
        if (res.ok) {
          const data = await res.json();
          setServerOnline(true);
          setActiveSubscribers(data.subscribersCount || 0);
        } else {
          setServerOnline(false);
        }
      } catch (e) {
        setServerOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans" dir="rtl">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0d162a]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
                درة السيارة — منظومة المراسلة والرد الذكي
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                مستقل V1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Omnichannel Social Bot & Live Inbox · إنستغرام، فيسبوك، تيك توك، واتساب
            </p>
          </div>
        </div>

        {/* Live Channel Status Pills & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Server Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
            serverOnline 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{serverOnline ? 'خادم الويب هوك: حي (3005)' : 'الخادم: وضع محلي'}</span>
          </div>

          {/* TikTok Modal Button */}
          <button
            onClick={() => setShowTikTokModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow"
          >
            <span>🎵 تيك توك: {tiktokConfig.clientKey ? 'مربوط' : 'إعداد'}</span>
          </button>

          {/* Meta Modal Button */}
          <button
            onClick={() => setShowMetaModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow"
          >
            <span>📱 ميتا (@doracars22)</span>
          </button>

          {/* Quick Reload */}
          <button
            onClick={() => window.location.reload()}
            title="تحديث البيانات"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>
      </header>

      {/* Main Inbox Container */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1900px] w-full mx-auto">
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden min-h-[calc(100vh-140px)] flex flex-col">
          <OmnichannelInboxView />
        </div>
      </main>

      {/* Footer & Compliance */}
      <footer className="border-t border-slate-800/80 bg-[#0a101f] px-6 py-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>🔒 نظام خدمة العملاء والمراسلة — شركة درة السيارة لقطع غيار السيارات</span>
          <span>•</span>
          <span className="text-emerald-400 font-mono text-[11px]">بيانات حقيقية 100% بدون أي محاكاة</span>
        </div>
        
        <div className="flex items-center gap-3 text-[11px]">
          <Link to="/privacy" className="hover:text-slate-300 underline">
            سياسة الخصوصية
          </Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-slate-300 underline">
            شروط الاستخدام
          </Link>
          <span>•</span>
          <Link to="/data-deletion" className="hover:text-slate-300 underline">
            حذف البيانات
          </Link>
        </div>
      </footer>

      {/* Modals */}
      {showTikTokModal && (
        <TikTokIntegrationModal
          isOpen={showTikTokModal}
          onClose={() => setShowTikTokModal(false)}
        />
      )}

      {showMetaModal && (
        <MetaIntegrationModal
          isOpen={showMetaModal}
          onClose={() => setShowMetaModal(false)}
        />
      )}

    </div>
  );
}
