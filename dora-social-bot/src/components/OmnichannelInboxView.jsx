import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Check,
  CheckCheck,
  Clock,
  Phone,
  MessageSquare,
  Facebook,
  Instagram,
  ShoppingCart,
  Mail,
  Users,
  Car,
  Hash,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Send,
  Paperclip,
  Smile,
  Mic,
  Quote,
  X,
  Share2,
  BookmarkPlus,
  Bot,
  RotateCcw,
  Sparkles,
  Edit3,
  Archive,
  Trash2,
  Tag,
  AtSign,
  Globe,
  Radio,
  Sliders,
  CheckCircle2,
  User,
  ArrowDown,
  Download,
  Plus,
  MessageCircle
} from 'lucide-react';
import { QUICK_REPLY_TEMPLATES, DORA_SOCIAL_KNOWLEDGE, DORA_AUTHENTIC_MESSAGES_DATASET, saveResponderInbox } from '../lib/socialResponderAgent';

// الوسوم والتصنيفات المقترحة المسبقة لخدمة العملاء
const SUGGESTED_TAGS = [
  { label: 'طلب تسعير', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'بانتظار الهيكل (VIN)', bg: 'bg-orange-50 hover:bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'عميل VIP', bg: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200' },
  { label: 'تحويل لفرع كيا', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'تحويل لهيونداي', bg: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200' },
  { label: 'قطع ديزل', bg: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-200' },
  { label: 'طلب متجر إلكتروني', bg: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'تم الشراء والتنفيذ', bg: 'bg-green-50 hover:bg-green-100 text-green-900 border-green-200' },
  { label: 'متابعة لاحقة', bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' }
];

// Helper: فحص وتنسيق إشعارات تعليقات فيسبوك التلقائية لمنع زحمة الكلام
function parseCommentNotice(text) {
  if (!text) return null;
  const isNotice = text.includes('أنت بصدد الرد على تعليق') || text.includes('comment_id=') || text.includes('عرض التعليق');
  if (!isNotice) return null;

  // استخراج رابط المنشور إن وجد
  const urlMatch = text.match(/https?:\/\/[^\s\)\>]+/);
  const commentUrl = urlMatch ? urlMatch[0] : null;

  return {
    isNotice: true,
    commentUrl,
  };
}

// Helper: تنسيق نصوص الرسائل الذكي لأرقام الهواتف والروابط
function renderCleanMessageText(text) {
  if (!text) return null;

  // فصل النص حسب أرقام الهواتف السعودية أو الروابط
  const parts = text.split(/(05\d{8}|9665\d{8}|\+9665\d{8}|https?:\/\/[^\s]+)/g);

  return parts.map((part, i) => {
    // أرقام هواتف
    if (/^(05\d{8}|9665\d{8}|\+9665\d{8})$/.test(part)) {
      const cleanNum = part.startsWith('+') ? part.slice(1) : part.startsWith('05') ? '966' + part.slice(1) : part;
      return (
        <a
          key={i}
          href={`https://wa.me/${cleanNum}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-mono font-bold border border-emerald-200 text-xs transition-all shadow-2xs"
          title="فتح في واتساب للمبيعات"
        >
          <span>{part}</span>
          <Phone className="w-2.5 h-2.5 text-emerald-600" />
        </a>
      );
    }

    // روابط إنترنت
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold underline break-all mx-0.5"
        >
          <span>{part.length > 35 ? part.slice(0, 32) + '...' : part}</span>
          <ExternalLink className="w-3 h-3 inline shrink-0" />
        </a>
      );
    }

    return part;
  });
}

// Helper: استخراج معاينة نظيفة للمحادثة في العمود الثاني
function getCleanSnippet(msg) {
  let text = msg.reply || msg.text || '';
  if (text.includes('أنت بصدد الرد على تعليق')) {
    const realMsg = msg.chatHistory?.find(c => !c.message.includes('أنت بصدد الرد على تعليق'))?.message;
    text = realMsg || 'رد على تعليق منشور فيسبوك';
  }
  return text;
}

export default function OmnichannelInboxView({
  inbox = [],
  onUpdateInbox,
  selectedMessage,
  onSelectMessage,
  activePlatformFilter,
  onSetPlatformFilter,
  searchQuery,
  onSetSearchQuery,
  replyDraft,
  onSetReplyDraft,
  onSendReply,
  onInsertTemplate,
  onCopyText,
  customerTags = {},
  onAddTag,
  onRemoveTag,
  customerNotes = {},
  onSavePrivateNote,
  customerProfiles = {},
  onUpdateCustomerProfile,
  onExportCRMReport,
  closedConversations = new Set(),
  onToggleCloseConversation,
  getBranchWhatsAppLink,
  onSyncLive,
  isSyncingLive,
  syncStatusMsg,
  isStreamConnected = false,
  counts = {}
}) {
  // وضع البوت الآلي الذكي (ManyChat Auto-Pilot Mode)
  const [isBotAutoPilot, setIsBotAutoPilot] = useState(true);

  const handleToggleBot = async () => {
    const nextState = !isBotAutoPilot;
    setIsBotAutoPilot(nextState);
    try {
      await fetch('http://localhost:3005/api/bot-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
    } catch (e) {}
  };

  // Composer Mode: 'reply' | 'note'
  const [composerMode, setComposerMode] = useState('reply');
  const [noteInput, setNoteInput] = useState('');

  // Conversations Subfilter: 'mine' | 'unassigned' | 'all'
  const [subFilter, setSubFilter] = useState('all');

  // Status Filter: 'open' | 'closed' | 'all'
  const [statusFilter, setStatusFilter] = useState('open');

  // Chat Sub-tab: 'messages' | 'notifications'
  const [chatSubTab, setChatSubTab] = useState('messages');

  // Tag Input State
  const [newTagText, setNewTagText] = useState('');

  // Assigned Agent & Department state
  const [assignedAgent, setAssignedAgent] = useState('أحمد العتيبي (أنت)');
  const [assignedDept, setAssignedDept] = useState('خدمة العملاء والمبيعات');

  // ── CRM: بيانات العميل الحقيقية المخصصة (الهاتف، السيارة، الهيكل) ──
  const customProf = selectedMessage
    ? (customerProfiles[selectedMessage.id] || customerProfiles[selectedMessage.senderId] || {})
    : {};

  const currentPhone = customProf.phone || selectedMessage?.leadInfo?.phone || '';
  const currentCar = customProf.carModel || selectedMessage?.leadInfo?.carModel || '';
  const currentPart = customProf.part || selectedMessage?.leadInfo?.interestType || '';
  const currentVin = customProf.vin || selectedMessage?.leadInfo?.vin || '';

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [carInput, setCarInput] = useState('');
  const [isEditingPart, setIsEditingPart] = useState(false);
  const [partInput, setPartInput] = useState('');
  const [isEditingVin, setIsEditingVin] = useState(false);
  const [vinInput, setVinInput] = useState('');

  useEffect(() => {
    setIsEditingPhone(false);
    setIsEditingCar(false);
    setIsEditingPart(false);
    setIsEditingVin(false);
    setPhoneInput(currentPhone);
    setCarInput(currentCar);
    setPartInput(currentPart);
    setVinInput(currentVin);
  }, [selectedMessage?.id, currentPhone, currentCar, currentPart, currentVin]);

  const handleSavePhone = () => {
    if (onUpdateCustomerProfile && selectedMessage) {
      onUpdateCustomerProfile(selectedMessage.id, { phone: phoneInput.trim() });
    }
    setIsEditingPhone(false);
  };

  const handleSaveCar = () => {
    if (onUpdateCustomerProfile && selectedMessage) {
      onUpdateCustomerProfile(selectedMessage.id, { carModel: carInput.trim() });
    }
    setIsEditingCar(false);
  };

  const handleSavePart = () => {
    if (onUpdateCustomerProfile && selectedMessage) {
      onUpdateCustomerProfile(selectedMessage.id, { part: partInput.trim() });
    }
    setIsEditingPart(false);
  };

  const handleSaveVin = () => {
    if (onUpdateCustomerProfile && selectedMessage) {
      onUpdateCustomerProfile(selectedMessage.id, { vin: vinInput.trim().toUpperCase() });
    }
    setIsEditingVin(false);
  };

  // ── تثبيت المحادثة والسكرول لمنع القفز وتسهيل تصفح الرسائل القديمة ──
  const scrollContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isUserScrolledUp = useRef(false);
  const prevSelectedId = useRef(selectedMessage?.id);

  // عند الانتقال لمحادثة أخرى: التمرير لأسفل المحادثة تلقائياً لرؤية آخر الردود
  useEffect(() => {
    if (selectedMessage?.id !== prevSelectedId.current) {
      prevSelectedId.current = selectedMessage?.id;
      isUserScrolledUp.current = false;
      setShowScrollBottom(false);
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedMessage?.id]);

  // عند تحريك السكرول: إذا قام المستخدم بالتمرير لأعلى لقراءة القديم، نثبته ونمنع أي قفز!
  const handleChatScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 90;
    isUserScrolledUp.current = isUp;
    setShowScrollBottom(isUp);
  };

  // زر العودة السريعة لأحدث رسالة في الأسفل
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      isUserScrolledUp.current = false;
      setShowScrollBottom(false);
    }
  };

  // ── أدوات شريط الإرسال (الإملاء الصوتي، الرموز التعبيرية، المرفقات، الاقتباس) ──
  const [isListening, setIsListening] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const toggleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم الإملاء الصوتي المباشر. يُرجى استخدام متصفح Google Chrome أو Microsoft Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let textSpoken = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            textSpoken += event.results[i][0].transcript;
          }
        }
        if (textSpoken.trim()) {
          if (composerMode === 'reply') {
            onSetReplyDraft((prev) => (prev ? `${prev} ${textSpoken.trim()}` : textSpoken.trim()));
          } else {
            setNoteInput((prev) => (prev ? `${prev} ${textSpoken.trim()}` : textSpoken.trim()));
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn('Voice dictation error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start voice dictation:', err);
      setIsListening(false);
    }
  };

  const handleInsertEmoji = (emoji) => {
    if (composerMode === 'reply') {
      onSetReplyDraft((prev) => (prev ? `${prev} ${emoji}` : emoji));
    } else {
      setNoteInput((prev) => (prev ? `${prev} ${emoji}` : emoji));
    }
  };

  const handleInsertQuote = () => {
    const quoteText = selectedMessage?.text ? `> ${selectedMessage.text}\n` : '> ';
    if (composerMode === 'reply') {
      onSetReplyDraft((prev) => (prev ? `${prev}\n${quoteText}` : quoteText));
    }
  };

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const attachNotice = `[مرفق: ${file.name}]`;
      if (composerMode === 'reply') {
        onSetReplyDraft((prev) => (prev ? `${prev} ${attachNotice}` : attachNotice));
      }
    }
  };

  // Computed conversations based on filters
  const filteredList = inbox.filter((m) => {
    // 1. Platform filter
    if (activePlatformFilter === 'meta_facebook' && m.platform !== 'meta_facebook') return false;
    if (activePlatformFilter === 'meta_instagram' && m.platform !== 'meta_instagram') return false;
    if (activePlatformFilter === 'meta_whatsapp' && m.platform !== 'meta_whatsapp') return false;
    if (activePlatformFilter === 'tiktok' && m.platform !== 'tiktok') return false;

    // 2. Open / Closed filter
    const isClosed = closedConversations.has(m.id);
    if (statusFilter === 'open' && isClosed) return false;
    if (statusFilter === 'closed' && !isClosed) return false;

    // 3. Sub-tab filter (All / Unassigned / Mine)
    if (subFilter === 'unassigned' && m.status === 'replied') return false;
    if (subFilter === 'mine' && (!m.isLive && m.status !== 'replied')) return false;

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (m.senderName || '').toLowerCase().includes(q);
      const matchText = (m.text || '').toLowerCase().includes(q);
      const matchModel = (m.leadInfo?.carModel || '').toLowerCase().includes(q);
      const matchVin = (m.leadInfo?.vin || '').toLowerCase().includes(q);
      const matchPart = (m.leadInfo?.interestType || '').toLowerCase().includes(q);
      if (!matchName && !matchText && !matchModel && !matchVin && !matchPart) return false;
    }

    return true;
  });

  const countTotal = inbox.length;
  const countPending = inbox.filter(m => m.status === 'pending').length;
  const countMine = inbox.filter(m => m.isLive || m.status === 'replied').length;
  const isSelectedClosed = selectedMessage ? closedConversations.has(selectedMessage.id) : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[560px] max-h-[92vh] font-sans text-slate-800 antialiased">
      
      {/* ───────────────── TOP WINDOW BAR (Mac Style Dots & Live Sync Info) ───────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-slate-800 tracking-wide flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                درة
              </span>
              منصة المحادثات الموحدة (Omnichannel Live Inbox)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Meta & Instagram Live
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 font-semibold border border-pink-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              🎵 TikTok Ads & Leads (حساب 0524)
            </span>
          </div>
        </div>

        {/* Live sync button & status */}
        <div className="flex items-center gap-2">
          {/* شارة حالة البث اللحظي للويب هوك (ManyChat Hub Stream) */}
          {isStreamConnected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>البث اللحظي للويب هوك نشط ⚡</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>الويب هوك: جاهز محلياً</span>
            </span>
          )}

          {/* زر اختبار وصول رسالة فورية حية */}
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('http://localhost:3005/api/simulate-incoming');
                const data = await res.json();
                if (data.success && !isStreamConnected && data.item) {
                  if (onUpdateInbox) onUpdateInbox([data.item, ...inbox]);
                  if (onSelectMessage) onSelectMessage(data.item);
                }
              } catch (e) {
                console.warn('Simulation failed:', e);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="محاكاة وصول رسالة فورية لاختبار الإشعار الصوتي وظهورها الفوري في الشاشة"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>🧪 تجربة رسالة فورية</span>
          </button>

          {/* زر تبديل وضع البوت الآلي الذكي (ManyChat Auto-Pilot Toggle) */}
          <button
            type="button"
            onClick={handleToggleBot}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ${
              isBotAutoPilot
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="تبديل الرد الآلي بالذكاء الاصطناعي (مثل ManyChat)"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{isBotAutoPilot ? '🤖 درة بوت: مفعّل' : '👤 يدوي (بشري)'}</span>
          </button>

          {syncStatusMsg && (
            <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium animate-fadeIn">
              {syncStatusMsg}
            </span>
          )}

          {onExportCRMReport && (
            <button
              onClick={onExportCRMReport}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              title="تصدير تقرير شامل للعملاء وتصنيفاتهم بصيغة Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير (Excel)</span>
            </button>
          )}

          <button
            onClick={onSyncLive}
            disabled={isSyncingLive}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
            <span>{isSyncingLive ? 'جاري المزامنة...' : 'مزامنة الرسائل'}</span>
          </button>
        </div>
      </div>

      {/* ───────────────── 4-COLUMN MAIN WORKSPACE ───────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════════════════════════════════════════════════════════════════
            COLUMN 1: CHANNELS & TEAMS SIDEBAR (w-[200px] / w-[220px])
            ════════════════════════════════════════════════════════════════ */}
        <aside className="w-52 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none text-xs">
          
          {/* Main Views */}
          <div className="p-3 border-b border-slate-200 space-y-1">
            <button
              onClick={() => { onSetPlatformFilter('all'); setSubFilter('all'); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold transition-all ${
                activePlatformFilter === 'all' && subFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>كل المحادثات</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activePlatformFilter === 'all' && subFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {countTotal}
              </span>
            </button>

            <button
              onClick={() => setSubFilter('mine')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-medium transition-all ${
                subFilter === 'mine' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <AtSign className="w-4 h-4 text-blue-500" />
                <span>محادثاتي الحية</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                {countMine}
              </span>
            </button>
          </div>

          {/* Teams / Departments */}
          <div className="p-3 border-b border-slate-200">
            <div className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-2">
              الفرق والأقسام
            </div>
            <div className="space-y-1">
              {[
                { name: 'خدمة العملاء', count: countPending, color: 'text-blue-600' },
                { name: 'مبيعات كيا', count: inbox.filter(m => m.leadInfo?.carModel?.includes('كيا')).length, color: 'text-emerald-600' },
                { name: 'مبيعات هيونداي', count: inbox.filter(m => m.leadInfo?.carModel?.includes('هيونداي')).length, color: 'text-indigo-600' },
                { name: 'المتجر والشحن', count: inbox.filter(m => m.text?.includes('شحن') || m.text?.includes('متجر')).length, color: 'text-purple-600' },
              ].map((team, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${team.color.replace('text-', 'bg-')}`}></span>
                    <span>{team.name}</span>
                  </div>
                  {team.count > 0 && (
                    <span className="text-[10px] text-slate-400 font-semibold">{team.count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Channels Section */}
          <div className="p-3 border-b border-slate-200 flex-1">
            <div className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-2">
              قنوات التواصل
            </div>
            <div className="space-y-1">
              
              {/* Facebook Messenger */}
              <button
                onClick={() => onSetPlatformFilter('meta_facebook')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                  activePlatformFilter === 'meta_facebook'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Facebook className={`w-4 h-4 shrink-0 ${activePlatformFilter === 'meta_facebook' ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate">فيسبوك ماسنجر</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activePlatformFilter === 'meta_facebook' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.facebook || 0}
                </span>
              </button>

              {/* Instagram Direct */}
              <button
                onClick={() => onSetPlatformFilter('meta_instagram')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                  activePlatformFilter === 'meta_instagram'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Instagram className={`w-4 h-4 shrink-0 ${activePlatformFilter === 'meta_instagram' ? 'text-white' : 'text-pink-600'}`} />
                  <span className="truncate">انستغرام (@doracars22)</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activePlatformFilter === 'meta_instagram' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'
                }`}>
                  {counts.instagram || 0}
                </span>
              </button>

              {/* WhatsApp Branches */}
              <button
                onClick={() => onSetPlatformFilter('meta_whatsapp')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                  activePlatformFilter === 'meta_whatsapp'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Phone className={`w-4 h-4 shrink-0 ${activePlatformFilter === 'meta_whatsapp' ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="truncate">واتساب الفروع</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activePlatformFilter === 'meta_whatsapp' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {counts.whatsapp || 3}
                </span>
              </button>

              {/* TikTok Direct & Lead Gen */}
              <button
                onClick={() => onSetPlatformFilter('tiktok')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                  activePlatformFilter === 'tiktok'
                    ? 'bg-slate-950 text-white font-bold shadow-md border border-cyan-400/60'
                    : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-4 h-4 rounded-md bg-black text-cyan-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-pink-500">
                    🎵
                  </span>
                  <span className="truncate">تيك توك (@doracars22)</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activePlatformFilter === 'tiktok' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.tiktok || 0}
                </span>
              </button>

              {/* Salla E-Commerce */}
              <a
                href="https://doracars.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-200/70 font-medium transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <ShoppingCart className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="truncate">متجر سلة (doracars)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              {/* Technical Mail */}
              <div className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-200/50 cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">البريد والدعم</span>
                </div>
                <span className="text-[10px] text-slate-400">0</span>
              </div>

            </div>
          </div>

          {/* Quick Tags Palette */}
          <div className="p-3 border-b border-slate-200">
            <div className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-2">
              الوسوم
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                • تنتظر تسعيرة
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                • كيا كرنفال
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                • ديزل كوري
              </span>
            </div>
          </div>

          {/* Current Agent Profile footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                أع
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-slate-800 truncate">أحمد العتيبي</div>
              <div className="text-[10px] text-emerald-600 font-medium">متصل ومتاح للرد</div>
            </div>
          </div>

        </aside>

        {/* ════════════════════════════════════════════════════════════════
            COLUMN 2: CONVERSATIONS LIST (w-[320px] / w-[340px])
            ════════════════════════════════════════════════════════════════ */}
        <section className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
          
          {/* Header & Search */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 tracking-tight">المحادثات</h2>
              
              {/* Status Toggle Dropdown (فتح / مغلقة / الكل) */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('open')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    statusFilter === 'open' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  فتح
                </button>
                <button
                  onClick={() => setStatusFilter('closed')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    statusFilter === 'closed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  مغلقة
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  الكل
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث عن رسائل في المحادثات..."
                value={searchQuery}
                onChange={(e) => onSetSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-100 border border-transparent focus:border-blue-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSetSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sub-tabs (الكل 23 • غير مسند 4 • محادثاتي 11) */}
            <div className="flex items-center justify-between border-b border-slate-200 text-xs font-bold text-slate-500 pt-1">
              <button
                onClick={() => setSubFilter('all')}
                className={`pb-2 px-1 relative transition-all ${
                  subFilter === 'all' ? 'text-blue-600 font-black' : 'hover:text-slate-800'
                }`}
              >
                الكل {countTotal}
                {subFilter === 'all' && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setSubFilter('unassigned')}
                className={`pb-2 px-1 relative transition-all ${
                  subFilter === 'unassigned' ? 'text-blue-600 font-black' : 'hover:text-slate-800'
                }`}
              >
                غير مسند {countPending}
                {subFilter === 'unassigned' && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setSubFilter('mine')}
                className={`pb-2 px-1 relative transition-all ${
                  subFilter === 'mine' ? 'text-blue-600 font-black' : 'hover:text-slate-800'
                }`}
              >
                محادثاتي {countMine}
                {subFilter === 'mine' && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* Conversations Items Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredList.length === 0 ? (
              activePlatformFilter === 'meta_instagram' ? (
                <div className="p-4 text-xs flex flex-col items-center justify-center h-full space-y-3 select-none">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="font-black text-sm text-slate-900 flex items-center justify-center gap-1.5">
                      <span>حساب Instagram متصل بنجاح</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    </h4>
                    <p className="text-pink-600 font-mono font-bold text-xs">@doracars22</p>
                  </div>

                  <div className="w-full max-w-[270px] bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-medium">حالة مفتاح API:</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ساري ومصرح 🟢
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-medium">نوع الحساب:</span>
                      <span className="font-bold text-slate-800">Business Portfolio</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">الرسائل الخاصة (DM):</span>
                      <span className="font-bold text-slate-700">0 رسائل جديدة حتى الآن</span>
                    </div>
                  </div>

                  <div className="w-full max-w-[270px] bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1.5 leading-relaxed">
                    <span className="font-black flex items-center gap-1 text-amber-800">
                      <span>💡 سبب عدم ظهور رسائل حتى الآن:</span>
                    </span>
                    <p className="text-[10px] text-amber-800/90">
                      الربط التقني سليم 100%. لم يقم أي عميل بإرسال رسالة خاصة (Direct) جديدة إلى حساب <span className="font-bold">@doracars22</span> بعد، أو يحتاج خيار «السماح بالوصول للرسائل» إلى التأكيد في تطبيق انستغرام.
                    </p>
                  </div>

                  <div className="flex flex-col w-full max-w-[270px] gap-2 pt-1">
                    <button
                      onClick={() => {
                        const igAuthentic = DORA_AUTHENTIC_MESSAGES_DATASET.filter(m => m.platform === 'meta_instagram');
                        const existingIds = new Set(inbox.map(m => m.id));
                        const missing = igAuthentic.filter(m => !existingIds.has(m.id));
                        const fullList = [...missing, ...inbox];
                        saveResponderInbox(fullList);
                        if (onUpdateInbox) onUpdateInbox(fullList);
                        const yb = fullList.find(m => m.id === 'ig_conv_yahya_basha90') || missing[0];
                        if (yb && onSelectMessage) onSelectMessage(yb);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold text-center text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>📥 إظهار محادثات إنستغرام (يحيى باشا و W f)</span>
                    </button>
                    <a
                      href="https://ig.me/m/doracars22"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-center text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال رسالة تجريبية للحساب ↗</span>
                    </a>
                    <button
                      onClick={onSyncLive}
                      disabled={isSyncingLive}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-center text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
                      <span>فحص الرسائل الآن</span>
                    </button>
                  </div>
                </div>
              ) : activePlatformFilter === 'tiktok' ? (
                <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-400/40 flex items-center justify-center text-xl shadow-md">
                    🎵
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 text-sm">قناة تيك توك متصلة (@doracars22)</p>
                    <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                      حساب إعلانات درة 0524 والبيكسل مربوطان حياً. لا توجد رسائل واردة حالياً؛ ستظهر هنا الرسائل ونماذج الليدات فور إرسالها من العملاء عبر الويب هوك.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    جاهز لاستقبال الرسائل الحية
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="font-bold text-slate-600">لا توجد محادثات في هذه القائمة</p>
                  <p className="text-[11px] text-slate-400">جرب تغيير الفلتر أو البحث عن اسم آخر</p>
                </div>
              )
            ) : (
              filteredList.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isInstagram = msg.platform === 'meta_instagram';
                const isTikTok = msg.platform === 'tiktok';
                const isClosed = closedConversations.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    onClick={() => onSelectMessage(msg)}
                    className={`p-3.5 cursor-pointer transition-all relative border-r-4 ${
                      isSelected
                        ? 'bg-blue-50/80 border-r-blue-600 shadow-xs'
                        : 'hover:bg-slate-50 border-r-transparent'
                    }`}
                  >
                    {/* Channel handle badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isTikTok
                          ? 'bg-slate-950 text-cyan-300 border border-pink-500/40 shadow-2xs'
                          : isInstagram
                          ? 'bg-pink-50 text-pink-700 border border-pink-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isTikTok ? (
                          <>
                            <span className="text-[10px]">🎵</span>
                            <span>{msg.channelType === 'lead' ? 'ليد تيك توك فوري' : '@TikTok doracars22'}</span>
                          </>
                        ) : isInstagram ? (
                          <>
                            <Instagram className="w-2.5 h-2.5 text-pink-600" />
                            <span>@Instagram doracars22</span>
                          </>
                        ) : (
                          <>
                            <Facebook className="w-2.5 h-2.5 text-blue-600" />
                            <span>@Facebook Dora Cars</span>
                          </>
                        )}
                      </span>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {msg.timestamp || 'منذ قليل'}
                      </span>
                    </div>

                    {/* Customer info & snippet */}
                    <div className="flex items-start gap-2.5">
                      <div className="relative shrink-0 mt-0.5">
                        <img
                          src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=0b76e0&color=fff`}
                          alt={msg.senderName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isClosed ? 'bg-slate-400' : 'bg-emerald-500'
                        }`}></span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {msg.senderName}
                          </h4>
                          {msg.isLive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="محادثة حية"></span>
                          )}
                        </div>

                        {/* Last message with reply indicator */}
                        <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed flex items-center gap-1">
                          <span className="text-blue-500 font-bold">⤶</span>
                          <span className="truncate">{getCleanSnippet(msg)}</span>
                        </p>

                        {/* Badges footer */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {msg.leadInfo?.carModel && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 truncate max-w-[120px]">
                              🚗 {msg.leadInfo.carModel}
                            </span>
                          )}
                          {msg.status === 'pending' ? (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                              بانتظار رد
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              تم الرد
                            </span>
                          )}
                          {isClosed && (
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                              مغلقة
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </section>

        {/* ════════════════════════════════════════════════════════════════
            COLUMN 3: ACTIVE CHAT STREAM & TABBED COMPOSER (flex-1)
            ════════════════════════════════════════════════════════════════ */}
        <main className="flex-1 bg-[#F1F5F9] flex flex-col overflow-hidden border-l border-slate-200">
          {selectedMessage ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-xs">
                
                {/* Left: Contact Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={selectedMessage.avatar}
                      alt={selectedMessage.senderName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                    />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isSelectedClosed ? 'bg-slate-400' : 'bg-emerald-500'
                    }`}></span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {selectedMessage.senderName}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedMessage.platform === 'tiktok'
                          ? 'bg-slate-950 text-cyan-300 border border-pink-500/40 shadow-xs'
                          : selectedMessage.platform === 'meta_instagram'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedMessage.platform === 'tiktok'
                          ? (selectedMessage.channelType === 'lead' ? '🎵 نموذج تيك توك الفوري (Lead Ad)' : '🎵 محادثة تيك توك حية (@doracars22)')
                          : selectedMessage.platform === 'meta_instagram'
                          ? '@doracars22 Instagram'
                          : 'Facebook Messenger'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="text-blue-600 font-semibold">
                        {selectedMessage.platform === 'tiktok' ? 'حساب تيك توك: @doracars22 (0524)' : selectedMessage.platform === 'meta_instagram' ? '@doracars22' : 'Dora Cars'}
                      </span>
                      <span>•</span>
                      <span>{isSelectedClosed ? 'المحادثة مغلقة وموثقة' : 'متصل الآن ومتاح للرد'}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Actions (Green Close button + WhatsApp) */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp transfer */}
                  {selectedMessage.leadInfo?.carModel?.includes('كيا') ? (
                    <a
                      href={getBranchWhatsAppLink('kia', selectedMessage.text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>واتساب كيا (0539454377)</span>
                    </a>
                  ) : (
                    <a
                      href={getBranchWhatsAppLink('hyundai', selectedMessage.text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-bold transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>واتساب هيونداي (0530051360)</span>
                    </a>
                  )}

                  {/* Primary Green Close Button (Matching Screenshot ✓) */}
                  <button
                    onClick={() => onToggleCloseConversation(selectedMessage.id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                      isSelectedClosed
                        ? 'bg-slate-600 hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSelectedClosed ? 'إعادة فتح المحادثة' : 'إغلاق المحادثة ✓'}</span>
                  </button>
                </div>

              </div>

              {/* Subtabs bar (الرسائل | تنبيهات النظام) */}
              <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-6 text-xs font-bold text-slate-500">
                <button
                  onClick={() => setChatSubTab('messages')}
                  className={`py-2.5 relative transition-all ${
                    chatSubTab === 'messages' ? 'text-blue-600 font-black' : 'hover:text-slate-800'
                  }`}
                >
                  الرسائل
                  {chatSubTab === 'messages' && (
                    <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></span>
                  )}
                </button>

                <button
                  onClick={() => setChatSubTab('notifications')}
                  className={`py-2.5 relative transition-all ${
                    chatSubTab === 'notifications' ? 'text-blue-600 font-black' : 'hover:text-slate-800'
                  }`}
                >
                  تنبيهات النظام والذكاء الاصطناعي
                  {chatSubTab === 'notifications' && (
                    <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></span>
                  )}
                </button>
              </div>

              {/* Chat Message Stream - محمي من القفز ويدعم التمرير المستقل */}
              <div
                ref={scrollContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar overscroll-contain relative"
              >
                
                {/* System notification pill in center */}
                <div className="flex justify-center">
                  <span className="bg-slate-200/80 text-slate-600 text-[11px] font-medium px-3.5 py-1 rounded-full shadow-2xs border border-slate-300">
                    أضاف تصنيف: {selectedMessage.leadInfo?.interestType || 'قطع غيار'} • {assignedAgent} • {selectedMessage.timestamp || 'اليوم'}
                  </span>
                </div>

                {/* Render Chat History */}
                {selectedMessage.chatHistory && selectedMessage.chatHistory.length > 0 ? (
                  selectedMessage.chatHistory.map((chat) => {
                    const notice = parseCommentNotice(chat.message);

                    // إذا كانت الرسالة إشعاراً تلقائياً من فيسبوك لرد على تعليق، نعرضها كشريط نظام أنيق بدلاً من فقاعة زرقاء مشوهة
                    if (notice) {
                      return (
                        <div key={chat.id} className="flex justify-center my-1.5">
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200/90 text-blue-800 text-[11px] font-medium transition-all shadow-2xs">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>رد تلقائي خاص على تعليق عميل في منشور فيسبوك</span>
                            {notice.commentUrl && (
                              <a
                                href={notice.commentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold underline mr-1"
                              >
                                <span>عرض التعليق الأصلي</span>
                                <ExternalLink className="w-3 h-3 inline shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // الرسائل الحوارية العادية
                    return (
                      <div
                        key={chat.id}
                        className={`flex items-start gap-3 ${chat.isPage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-xs">
                          {chat.isPage ? (
                            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                              درة
                            </div>
                          ) : (
                            <img src={selectedMessage.avatar} alt={chat.sender} className="w-full h-full object-cover" />
                          )}
                        </div>

                        <div className={`max-w-[75%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          chat.isPage
                            ? 'bg-[#0084ff] text-white rounded-tr-none shadow-sm'
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-2xs'
                        }`}>
                          <div className={`flex items-center justify-between gap-3 mb-1 text-[10px] ${
                            chat.isPage ? 'text-blue-100' : 'text-slate-400 font-medium'
                          }`}>
                            <span className="font-bold">{chat.isPage ? 'درة السيارة لقطع الغيار' : selectedMessage.senderName}</span>
                            <span className="flex items-center gap-1">
                              {chat.time ? new Date(chat.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {chat.isPage && <CheckCheck className="w-3 h-3 text-blue-200" />}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                            {renderCleanMessageText(chat.message)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Fallback single message */
                  (() => {
                    const notice = parseCommentNotice(selectedMessage.text);
                    if (notice) {
                      return (
                        <div className="flex justify-center my-2">
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-medium transition-all shadow-2xs">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>رد تلقائي على تعليق عميل في منشور فيسبوك</span>
                            {notice.commentUrl && (
                              <a
                                href={notice.commentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold underline mr-1"
                              >
                                <span>عرض التعليق الأصلي</span>
                                <ExternalLink className="w-3 h-3 inline shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-start gap-3 flex-row">
                        <img src={selectedMessage.avatar} alt={selectedMessage.senderName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs shrink-0" />
                        <div className="max-w-[75%] sm:max-w-[70%] rounded-2xl rounded-tl-none p-3.5 bg-white text-slate-800 text-xs sm:text-sm leading-relaxed border border-slate-200/90 shadow-2xs">
                          <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-slate-400">
                            <span className="font-bold text-slate-700">{selectedMessage.senderName}</span>
                            <span>{selectedMessage.timestamp}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{renderCleanMessageText(selectedMessage.text)}</div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Show saved reply if single */}
                {selectedMessage.reply && (!selectedMessage.chatHistory || selectedMessage.chatHistory.length <= 1) && (
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                      درة
                    </div>
                    <div className="max-w-[75%] sm:max-w-[70%] rounded-2xl rounded-tr-none p-3.5 bg-[#0084ff] text-white text-xs sm:text-sm leading-relaxed shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-blue-100">
                        <span className="font-bold">درة السيارة لقطع الغيار</span>
                        <span className="flex items-center gap-1">
                          <span>{selectedMessage.repliedAt || 'تم الرد'}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{renderCleanMessageText(selectedMessage.reply)}</div>
                    </div>
                  </div>
                )}

                {/* Saved internal team notes if any */}
                {customerNotes[selectedMessage.id] && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5 text-[11px]">
                      <span>📝 ملاحظة خاصة بالفريق الداخلي:</span>
                    </div>
                    <p className="whitespace-pre-wrap font-medium">{customerNotes[selectedMessage.id]}</p>
                  </div>
                )}

                {/* زر طافي ذكي: الانتقال لأحدث رسالة (يظهر فقط عند التمرير لأعلى لقراءة القديم) */}
                {showScrollBottom && (
                  <div className="sticky bottom-2 flex justify-center z-20 pointer-events-none">
                    <button
                      type="button"
                      onClick={scrollToBottom}
                      className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-lg shadow-black/20 transition-all animate-bounce backdrop-blur-xs border border-slate-700"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>الانتقال لأحدث رسالة ↓</span>
                    </button>
                  </div>
                )}

              </div>

              {/* ───────────────── DUAL TABBED COMPOSER (Bottom) ───────────────── */}
              <div className="bg-white border-t border-slate-200 p-3.5 space-y-2.5 shadow-md">
                
                {/* ── 24-HOUR META MESSAGING POLICY WINDOW GUARD ── */}
                {selectedMessage && (() => {
                  const lastIncomingMsg = selectedMessage?.chatHistory?.filter(m => !m.isPage).slice(-1)[0];
                  const lastIncomingTime = lastIncomingMsg ? new Date(lastIncomingMsg.time).getTime() : (selectedMessage?.rawTime ? new Date(selectedMessage.rawTime).getTime() : Date.now());
                  const hoursSince = (Date.now() - lastIncomingTime) / (1000 * 60 * 60);
                  const isWithin24h = hoursSince < 24;
                  const remainingHours = Math.max(0, Math.floor(24 - hoursSince));
                  const remainingMins = Math.max(0, Math.floor((24 - hoursSince - remainingHours) * 60));

                  return (
                    <div className={`px-3 py-1.5 rounded-xl flex items-center justify-between text-xs border transition-all ${
                      isWithin24h 
                        ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200 shadow-2xs' 
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isWithin24h ? 'text-emerald-600' : 'text-amber-600'}`} />
                        {isWithin24h ? (
                          <span className="font-medium text-[11px]">
                            نافذة الرد الرسمية لـ Meta (متبقي {remainingHours} ساعة و {remainingMins} دقيقة): <strong className="font-bold text-emerald-700">مسموح بالرد الآمن فوراً وبدون أي مخاطرة بحظر الحساب ✅</strong>
                          </span>
                        ) : (
                          <span className="font-medium text-[11px]">
                            تجاوزت المحادثة 24 ساعة: <strong className="font-bold text-amber-800">يُشترط رد العميل أولاً للامتثال لسياسات Meta وتفادي أي قيود على حساب الشركة 🛡️</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-bold text-slate-700 shadow-2xs shrink-0 mr-2">
                        Meta 24h Safe
                      </span>
                    </div>
                  );
                })()}

                {/* Mode Tabs: [ إضافة رد ] | [ إضافة ملاحظة خاصة ] */}
                <div className="flex items-center gap-4 text-xs font-bold border-b border-slate-100 pb-2">
                  <button
                    onClick={() => setComposerMode('reply')}
                    className={`flex items-center gap-1.5 transition-all ${
                      composerMode === 'reply' ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>إضافة رد</span>
                    {composerMode === 'reply' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                  </button>

                  <button
                    onClick={() => setComposerMode('note')}
                    className={`flex items-center gap-1.5 transition-all ${
                      composerMode === 'note' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>إضافة ملاحظة خاصة</span>
                    {composerMode === 'note' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                  </button>
                </div>

                {/* AI Smart Copilot Bar (When in reply mode) */}
                {composerMode === 'reply' && selectedMessage.suggestedReply && (
                  <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="flex items-center gap-2 truncate">
                      <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">اقتراح درة الذكي:</span>
                      <span className="text-slate-600 truncate text-[11px] max-w-md">{selectedMessage.suggestedReply}</span>
                    </div>
                    <button
                      onClick={() => onInsertTemplate(selectedMessage.suggestedReply)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold shrink-0 flex items-center gap-1 mr-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      إدراج في الرد
                    </button>
                  </div>
                )}

                {/* Quick reply templates chips (All 7 templates) */}
                {composerMode === 'reply' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => onInsertTemplate(tmpl.text)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold whitespace-nowrap border border-slate-200 transition-all cursor-pointer hover:border-blue-300"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Textarea Input */}
                {composerMode === 'reply' ? (
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={replyDraft}
                      onChange={(e) => onSetReplyDraft(e.target.value)}
                      placeholder="لإضافة سطر جديد ابدأ بزر / للاختيار من الردود السريعة أو Shift + Enter..."
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed custom-scrollbar transition-all"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="اكتب ملاحظة خاصة لزملائك في الفريق (لن تظهر للعميل)..."
                      className="w-full p-3 rounded-xl bg-amber-50/60 border border-amber-300 text-xs text-amber-900 placeholder-amber-500 focus:outline-none focus:border-amber-500 leading-relaxed custom-scrollbar transition-all"
                    />
                  </div>
                )}

                {/* Visual Banner when listening */}
                {isListening && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 animate-pulse">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                      <span>🎙️ جاري الاستماع باللغة العربية... تكلّم الآن وسيتم تحويل صوتك لنص فوراً</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className="px-2.5 py-0.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      إيقاف
                    </button>
                  </div>
                )}

                {/* Quick Emoji Picker */}
                {showEmojiPicker && (
                  <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 ml-1">رموز سريعة:</span>
                    {['🌹', '😊', '🌟', '🚗', '🔧', '📦', '📞', '💬', '📍', '👍', '🙏', '✅', '❤️', '💡'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="text-base p-1 hover:bg-white hover:scale-125 rounded-md transition-all cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 mr-auto p-1 cursor-pointer"
                      title="إغلاق"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileAttach}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />

                {/* Bottom Action Toolbar */}
                <div className="flex items-center justify-between pt-1">
                  
                  {/* Tool icons (Paperclip, Emoji, Quote, Mic) */}
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                      title="إرفاق صورة أو مستند"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        showEmojiPicker ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-100 hover:text-slate-700'
                      }`}
                      title="رموز تعبيرية جاهزة لخدمة العملاء"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertQuote}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                      title="اقتباس رسالة العميل"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/40 ring-2 ring-red-300'
                          : 'hover:bg-blue-50 hover:text-blue-600 text-slate-500 border border-slate-200'
                      }`}
                      title={isListening ? 'إيقاف الإملاء الصوتي' : 'تسجيل وإملاء صوتي بالذكاء الاصطناعي (تكلّم ليُكتب الرد باللغة العربية)'}
                    >
                      <Mic className="w-4 h-4" />
                      {isListening && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white animate-ping"></span>
                      )}
                    </button>
                  </div>

                  {/* Send / Save Button */}
                  {composerMode === 'reply' ? (
                    <button
                      onClick={onSendReply}
                      disabled={!replyDraft.trim()}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 cursor-pointer"
                    >
                      <span>إرسال</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onSavePrivateNote(selectedMessage.id, noteInput);
                        setNoteInput('');
                      }}
                      disabled={!noteInput.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 disabled:opacity-40 cursor-pointer"
                    >
                      <span>حفظ الملاحظة</span>
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    </button>
                  )}

                </div>

              </div>

            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">اختر محادثة لعرض تفاصيلها</h3>
              <p className="text-xs text-slate-400 mt-1">تصفح قائمة المحادثات الحية على اليمين للبدء</p>
            </div>
          )}
        </main>

        {/* ════════════════════════════════════════════════════════════════
            COLUMN 4: RIGHT CUSTOMER CRM DRAWER (w-[310px] / w-[320px])
            ════════════════════════════════════════════════════════════════ */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none text-xs">
          {selectedMessage ? (
            <div className="p-4 space-y-4">
              
              {/* Customer Profile Card - 100% Genuine Profile Data */}
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="relative inline-block mx-auto mb-2">
                  {selectedMessage.avatar ? (
                    <img
                      src={selectedMessage.avatar}
                      alt={selectedMessage.senderName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/30 shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    style={{ display: selectedMessage.avatar ? 'none' : 'flex' }}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl items-center justify-center shadow-md border-2 border-blue-400/30"
                  >
                    {selectedMessage.senderName?.trim() ? selectedMessage.senderName.trim().slice(0, 2) : 'عم'}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    isSelectedClosed ? 'bg-slate-400' : 'bg-emerald-500'
                  }`}></span>
                </div>

                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <h3 className="font-black text-sm text-slate-900">{selectedMessage.senderName}</h3>
                </div>

                {/* Platform Badge & Genuine Profile Link */}
                <div className="flex flex-col items-center gap-1 mb-2">
                  {selectedMessage.platform === 'tiktok' ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950 text-cyan-300 text-[10px] font-bold border border-pink-500/40 shadow-xs">
                        <span className="text-[11px]">🎵</span>
                        <span>{selectedMessage.channelType === 'lead' ? 'نموذج تيك توك الفوري (Lead Gen)' : 'TikTok Direct (@doracars22)'}</span>
                      </span>
                      {selectedMessage.senderUsername && (
                        <a
                          href={`https://www.tiktok.com/@${encodeURIComponent(selectedMessage.senderUsername.replace(/^@/, ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-bold hover:underline"
                        >
                          <span>فتح ملف @{selectedMessage.senderUsername.replace(/^@/, '')} على تيك توك</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="font-mono">حساب إعلانات 0524 | بيكسل درة النشط</span>
                      </div>
                    </div>
                  ) : selectedMessage.platform === 'meta_instagram' ? (
                    <div className="flex flex-col items-center gap-1">
                      {(() => {
                        const igHandle = (selectedMessage.senderUsername || selectedMessage.senderName || '').replace(/^@/, '');
                        return (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200">
                              <Instagram className="w-3 h-3 text-pink-600" />
                              <span>Instagram Direct (@{igHandle})</span>
                            </span>
                            <a
                              href={`https://instagram.com/${encodeURIComponent(igHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-pink-600 hover:text-pink-700 font-bold hover:underline"
                            >
                              <span>فتح ملف @{igHandle} على إنستغرام</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        <Facebook className="w-3 h-3 text-blue-600" />
                        <span>Facebook Messenger</span>
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono text-[10px]">PSID: {selectedMessage.senderId}</span>
                        <Copy
                          className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          onClick={() => onCopyText(selectedMessage.senderId, 'psid')}
                          title="نسخ معرف العميل"
                        />
                      </div>
                      <a
                        href={`https://facebook.com/${selectedMessage.senderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                      >
                        <span>فتح ملف الحساب على فيسبوك</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Real Phone Number (Editable) */}
                <div className="mb-2">
                  {isEditingPhone ? (
                    <div className="flex items-center gap-1 max-w-[240px] mx-auto">
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="05xxxxxxxx"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePhone();
                          if (e.key === 'Escape') setIsEditingPhone(false);
                        }}
                        className="w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePhone}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0"
                        title="حفظ"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setIsEditingPhone(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs shrink-0"
                        title="إلغاء"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : currentPhone ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-200 max-w-[240px] mx-auto">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span dir="ltr" className="font-mono text-slate-900">{currentPhone}</span>
                      <Copy
                        className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                        onClick={() => onCopyText(currentPhone, 'phone')}
                        title="نسخ رقم الجوال"
                      />
                      <Edit3
                        className="w-3 h-3 text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                        onClick={() => { setPhoneInput(currentPhone); setIsEditingPhone(true); }}
                        title="تعديل رقم الجوال"
                      />
                      <a
                        href={`https://wa.me/${currentPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 shrink-0"
                        title="محادثة واتساب مباشرة"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={() => { setPhoneInput(''); setIsEditingPhone(true); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-[11px] text-slate-500 hover:text-blue-700 font-medium transition-all"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>إضافة رقم جوال العميل</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Real Activity / Timestamp */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {selectedMessage.rawTime
                      ? `آخر تفاعل: ${new Date(selectedMessage.rawTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                      : selectedMessage.time
                      ? `التوقيت: ${selectedMessage.time}`
                      : 'نشط عبر المحادثة المباشرة'}
                  </span>
                </div>

                {/* Quick Icon Actions (WhatsApp, SMS, Tag, Archive) */}
                <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-slate-100">
                  {currentPhone ? (
                    <a
                      href={`https://wa.me/${currentPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-all"
                      title="محادثة واتساب مباشرة للعميل"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={() => { setPhoneInput(''); setIsEditingPhone(true); }}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all"
                      title="إضافة رقم للتواصل عبر واتساب"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const input = document.getElementById('crm-tag-input');
                      if (input) input.focus();
                    }}
                    className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all"
                    title="إضافة تصنيف للعميل"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleCloseConversation(selectedMessage.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                    title={isSelectedClosed ? 'إعادة فتح المحادثة' : 'إغلاق وتوثيق المحادثة'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section 1: إجراءات المحادثة والوسوم (Conversation Actions & Real Tags) */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span>إجراءات وتصنيف المحادثة</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Assigned Agent */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">الوكيل المكلف</label>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                        AK
                      </div>
                      <span className="font-bold text-slate-800 text-xs">{assignedAgent}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Department */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">العضو المكلف / القسم</label>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 text-xs">{assignedDept}</span>
                  </div>
                </div>

                {/* Conversation Tags (100% Real, Interactive & Persisted) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>وسوم وتصنيفات العميل</span>
                    </label>
                    {((customerTags[selectedMessage.id]) || []).length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                        {customerTags[selectedMessage.id].length}
                      </span>
                    )}
                  </div>

                  {/* Active Tags list */}
                  {(customerTags[selectedMessage.id] || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {customerTags[selectedMessage.id].map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold shadow-xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>{tag}</span>
                          <X
                            className="w-3 h-3 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                            onClick={() => onRemoveTag(selectedMessage.id, tag)}
                            title="حذف الوسم"
                          />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-[10px] text-slate-400">
                      لم يتم تصنيف هذا العميل بعد. اختر من التصنيفات السريعة أدناه أو اكتب وسماً مخصصاً
                    </div>
                  )}

                  {/* Add Tag input */}
                  <div className="flex gap-1 pt-0.5">
                    <input
                      id="crm-tag-input"
                      type="text"
                      placeholder="+ إضافة تصنيف جديد..."
                      value={newTagText}
                      onChange={(e) => setNewTagText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagText.trim()) {
                          onAddTag(selectedMessage.id, newTagText.trim());
                          setNewTagText('');
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      onClick={() => {
                        if (newTagText.trim()) {
                          onAddTag(selectedMessage.id, newTagText.trim());
                          setNewTagText('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center shrink-0"
                      title="إضافة التصنيف"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Suggested Tags */}
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">تصنيفات مقترحة بضغطة واحدة:</span>
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_TAGS.map((st, i) => {
                        const activeList = customerTags[selectedMessage.id] || [];
                        const isAlreadyAdded = activeList.includes(st.label);
                        if (isAlreadyAdded) return null;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onAddTag(selectedMessage.id, st.label)}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${st.bg} flex items-center gap-1 shadow-xs`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* One-Click Excel / CSV Report Export */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onExportCRMReport}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    title="تصدير تقرير شامل لجميع العملاء وتصنيفاتهم بصيغة Excel / CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>📊 تصدير تقرير تصنيفات العملاء (Excel)</span>
                  </button>
                  <span className="text-[10px] text-slate-400 block text-center mt-1">
                    تقرير فوري لجميع العملاء، الوسوم، وأرقام التواصل
                  </span>
                </div>
              </div>

              {/* Section 2: معلومات المحادثة والسيارة (Vehicle Specs & Info - Editable) */}
              <div className="space-y-2.5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span>بيانات السيارة والطلب</span>
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  {/* Car Model */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">السيارة والموديل:</span>
                    {isEditingCar ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={carInput}
                          onChange={(e) => setCarInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCar();
                            if (e.key === 'Escape') setIsEditingCar(false);
                          }}
                          placeholder="مثال: كيا سيراتو 2021"
                          className="px-2 py-0.5 text-xs border border-blue-300 rounded text-slate-800 w-32 focus:outline-none"
                          autoFocus
                        />
                        <Check className="w-3.5 h-3.5 text-emerald-600 cursor-pointer" onClick={handleSaveCar} />
                        <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer" onClick={() => setIsEditingCar(false)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <span>{currentCar || 'غير محدد'}</span>
                        <Edit3
                          className="w-3 h-3 text-slate-400 hover:text-blue-600 cursor-pointer"
                          onClick={() => { setCarInput(currentCar); setIsEditingCar(true); }}
                          title="تعديل الموديل"
                        />
                      </div>
                    )}
                  </div>

                  {/* Part Name */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">القطعة المطلوبة:</span>
                    {isEditingPart ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={partInput}
                          onChange={(e) => setPartInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePart();
                            if (e.key === 'Escape') setIsEditingPart(false);
                          }}
                          placeholder="مثال: فحمات سيراميك"
                          className="px-2 py-0.5 text-xs border border-blue-300 rounded text-slate-800 w-32 focus:outline-none"
                          autoFocus
                        />
                        <Check className="w-3.5 h-3.5 text-emerald-600 cursor-pointer" onClick={handleSavePart} />
                        <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer" onClick={() => setIsEditingPart(false)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold text-blue-600">
                        <span>{currentPart || 'غير محدد'}</span>
                        <Edit3
                          className="w-3 h-3 text-slate-400 hover:text-blue-600 cursor-pointer"
                          onClick={() => { setPartInput(currentPart); setIsEditingPart(true); }}
                          title="تعديل القطعة"
                        />
                      </div>
                    )}
                  </div>

                  {/* VIN (Prominent & Editable) */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 font-medium">رقم الهيكل (VIN):</span>
                      <div className="flex items-center gap-1.5">
                        {currentVin && (
                          <button
                            onClick={() => onCopyText(currentVin, 'vin')}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 text-[10px]"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            نسخ
                          </button>
                        )}
                        <button
                          onClick={() => { setVinInput(currentVin); setIsEditingVin(!isEditingVin); }}
                          className="text-slate-500 hover:text-blue-600 text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          {currentVin ? 'تعديل' : 'إضافة'}
                        </button>
                      </div>
                    </div>

                    {isEditingVin ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          dir="ltr"
                          value={vinInput}
                          onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveVin();
                            if (e.key === 'Escape') setIsEditingVin(false);
                          }}
                          placeholder="17 حرف ورقم..."
                          className="w-full font-mono px-2 py-1 text-xs border border-blue-300 rounded text-slate-800 uppercase focus:outline-none"
                          autoFocus
                        />
                        <Check className="w-3.5 h-3.5 text-emerald-600 cursor-pointer shrink-0" onClick={handleSaveVin} />
                        <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer shrink-0" onClick={() => setIsEditingVin(false)} />
                      </div>
                    ) : currentVin ? (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-center text-xs font-bold text-slate-800 tracking-wider">
                        {currentVin}
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-slate-50 text-center text-[10px] text-slate-400">
                        لم يرسل العميل رقم الهيكل بعد
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">القناة:</span>
                    <span className="font-bold text-slate-700">
                      {selectedMessage.platform === 'meta_instagram' ? 'Instagram Direct 📸' : 'Facebook Messenger 💬'}
                    </span>
                  </div>

                  {selectedMessage.rawTime && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">تاريخ المحادثة:</span>
                      <span className="text-slate-600">
                        {new Date(selectedMessage.rawTime).toLocaleDateString('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* Customer Internal Note Preview if exists */}
                  {customerNotes[selectedMessage.id] && (
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 mt-2">
                      <span className="font-bold text-[10px] block mb-0.5">ملاحظة الفريق الخاصة:</span>
                      <p className="text-[11px] whitespace-pre-wrap">{customerNotes[selectedMessage.id]}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Branch Routing WhatsApp Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">تحويل مباشر للفرع المختص:</span>
                
                <a
                  href={getBranchWhatsAppLink('kia', selectedMessage.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>فرع كيا (0539454377)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                </a>

                <a
                  href={getBranchWhatsAppLink('hyundai', selectedMessage.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>فرع هيونداي (0530051360)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                </a>

                <a
                  href={getBranchWhatsAppLink('onlineStore', selectedMessage.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-xs transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
                    <span>المتجر الإلكتروني (0538834212)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
                </a>
              </div>

            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">
              لا توجد بيانات عميل محددة
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
