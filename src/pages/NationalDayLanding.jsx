import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Car,
  CheckCircle2,
  Phone,
  MessageCircle,
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  Tag,
  Copy,
  Check,
  ChevronDown,
  ArrowLeft,
  Flame,
  Truck,
  CreditCard,
  Building2,
  Wrench,
  Fuel,
  Search,
  ExternalLink,
  ChevronLeft,
  HelpCircle,
  Zap,
  Percent,
  Star
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

// Campaign Configurations
const COUPON_CODE = 'KSA96';
const CAMPAIGN_END_DATE = '2026-09-24T23:59:59';

// Contacts & Channels
const CONTACTS = {
  hyundai: {
    name: 'فرع هيونداي (الرواف)',
    phone: '0555138150',
    cleanPhone: '966555138150',
    location: 'القصيم - بريدة - طريق الرواف',
    mapsUrl: 'https://maps.google.com/?q=Dorat+Al+Sayarah+Hyundai+Buraidah',
    badge: 'وكالة ومبيعات هيونداي (بنزين وديزل)',
    color: '#0284c7',
    gradient: 'from-sky-600 via-sky-500 to-indigo-700',
    accentBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400'
  },
  kia: {
    name: 'فرع كيا (السليم)',
    phone: '0555138151',
    cleanPhone: '966555138151',
    location: 'القصيم - بريدة - حي السليم',
    mapsUrl: 'https://maps.google.com/?q=Dorat+Al+Sayarah+Kia+Buraidah',
    badge: 'وكالة ومبيعات كيا (بنزين وديزل)',
    color: '#7c3aed',
    gradient: 'from-purple-600 via-indigo-600 to-rose-600',
    accentBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  },
  store: {
    name: 'المتجر الإلكتروني والشحن',
    url: 'https://dorat-cars.com',
    phone: '0555138152',
    cleanPhone: '966555138152',
    coverage: 'توصيل وشحن سريع لكافة مدن المملكة',
    badge: 'تسوق أونلاين 24/7 + تقسيط تمارا وتابي',
    color: '#10b981',
    gradient: 'from-emerald-600 via-teal-500 to-emerald-700',
    accentBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
  }
};

// National Day Promotional Bundles
const PROMO_BUNDLES = [
  {
    id: 'b1',
    title: 'باقة الصيانة الدورية الملكية',
    tag: 'الأكثر طلباً ⭐',
    brand: 'هيونداي وكيا (بنزين / ديزل)',
    discount: '35%',
    oldPrice: '480',
    price: '312',
    savings: '168',
    features: [
      'طقم فلاتر أصلية معتمدة (زيت + هواء + مكيف كربوني)',
      'زيت محرك تخليقي عالي الجودة معتمد',
      'طقم بواجي أصلية مطابقة لرقم الهيكل',
      'فحص شامل ومطابقة مجانية 100%'
    ],
    bgGradient: 'from-emerald-950/60 to-slate-900',
    border: 'border-emerald-500/40'
  },
  {
    id: 'b2',
    title: 'باقة الفرامل والسلامة المتكاملة',
    tag: 'عرض اليوم الوطني 🇸🇦',
    brand: 'هيونداي وكيا',
    discount: '40%',
    oldPrice: '750',
    price: '450',
    savings: '300',
    features: [
      'طقم أقمشة وفحمات فرامل أمامية أصلية',
      'طقم أقمشة وفحمات فرامل خلفية أصلية',
      'زيت فرامل أصلي DOT4 مقاوم للحرارة',
      'ضمان عدم حدوث أصوات أو صفير'
    ],
    bgGradient: 'from-amber-950/50 to-slate-900',
    border: 'border-amber-500/40'
  },
  {
    id: 'b3',
    title: 'باقة منظومة الديزل والشاحنات الخفيفة',
    tag: 'توفير استثنائي 🛢️',
    brand: 'محركات الديزل (ستاريا، H100، سنتافي، سورينتو)',
    discount: '30%',
    oldPrice: '1450',
    price: '1015',
    savings: '435',
    features: [
      'فلتر ديزل أصلي مع حساس الماء',
      'مجموعة صمامات وبخاخات أصلية مطابقة',
      'منظف ومنقي دورة الديزل المعتمد',
      'مطابقة دقيقة عبر رقم الهيكل VIN'
    ],
    bgGradient: 'from-sky-950/60 to-slate-900',
    border: 'border-sky-500/40'
  },
  {
    id: 'b4',
    title: 'باقة التبريد والتكييف الصيفي',
    tag: 'حماية وتبريد ❄️',
    brand: 'هيونداي وكيا',
    discount: '45%',
    oldPrice: '890',
    price: '489',
    savings: '401',
    features: [
      'رديتر أصلي أو كمبروسر تبريد معتمد',
      'ماء رديتر أصلي تركيز 50/50 طويل المدى',
      'فلتر مكيف نانو كربون مضاد للروائح',
      'بلف حرارة وثرموستات أصلي'
    ],
    bgGradient: 'from-purple-950/50 to-slate-900',
    border: 'border-purple-500/40'
  }
];

// Popular Car Models
const POPULAR_MODELS = {
  hyundai: [
    { name: 'سوناتا (Sonata)', years: '2015 - 2026', engines: 'بنزين / هايبرد', badge: 'متوفر بالكامل' },
    { name: 'إلنترا (Elantra)', years: '2014 - 2026', engines: 'بنزين', badge: 'عروض خاصة' },
    { name: 'أكسنت (Accent)', years: '2012 - 2026', engines: 'بنزين', badge: 'أعلى مبيعاً' },
    { name: 'توسان (Tucson)', years: '2016 - 2026', engines: 'بنزين / ديزل', badge: 'بنزين وديزل' },
    { name: 'سنتافي (Santa Fe)', years: '2013 - 2026', engines: 'بنزين / ديزل', badge: 'بنزين وديزل' },
    { name: 'أزيرا (Azera)', years: '2012 - 2026', engines: 'بنزين', badge: 'قطع أصلية' },
    { name: 'ستاريا (Staria)', years: '2021 - 2026', engines: 'ديزل / بنزين', badge: 'منظومة ديزل' },
    { name: 'H100 / باص H1', years: '2010 - 2026', engines: 'ديزل CRDi', badge: 'شاحنات وديزل' }
  ],
  kia: [
    { name: 'سبورتاج (Sportage)', years: '2016 - 2026', engines: 'بنزين / ديزل', badge: 'أعلى مبيعاً' },
    { name: 'K5 / أوبتيما', years: '2014 - 2026', engines: 'بنزين / هايبرد', badge: 'عروض خاصة' },
    { name: 'سيراتو / K3', years: '2013 - 2026', engines: 'بنزين', badge: 'متوفر بالكامل' },
    { name: 'سورينتو (Sorento)', years: '2015 - 2026', engines: 'بنزين / ديزل', badge: 'بنزين وديزل' },
    { name: 'كارنفال (Carnival)', years: '2015 - 2026', engines: 'بنزين / ديزل', badge: 'عائلي وديزل' },
    { name: 'بيجاس (Pegas)', years: '2018 - 2026', engines: 'بنزين', badge: 'اقتصادي' },
    { name: 'كادينزا / K8', years: '2013 - 2026', engines: 'بنزين', badge: 'قطع فخمة' },
    { name: 'تيلورايد (Telluride)', years: '2020 - 2026', engines: 'بنزين', badge: 'SUV أصلي' }
  ]
};

// FAQ
const FAQS = [
  {
    q: 'كيف أستفيد من عروض اليوم الوطني وأحصل على الخصم؟',
    a: 'يمكنك الاستفادة مباشرة بزيارة فرع هيونداي (طريق الرواف) أو فرع كيا (حي السليم) في بريدة، أو عبر التواصل واتساب مع مبيعات الفرع، أو الطلب أونلاين عبر المتجر مع استخدام كود الخصم (KSA96).'
  },
  {
    q: 'كيف تضمنون مطابقة القطعة مع سيارتي 100%؟',
    a: 'لدينا في درة السيارة نظام فحص ومطابقة برقم الهيكل (VIN) متصل مباشرة بكتالوجات الوكالة الرسمية لشركتي هيونداي وكيا، مما يضمن توافق القطعة بنسبة 100% دون أي خطأ.'
  },
  {
    q: 'هل تتوفر قطع غيار محركات الديزل؟',
    a: 'نعم بكل تأكيد! درة السيارة متخصصة في منظومات محركات الديزل والبنزين الكورية (طرمبات الديزل، البخاخات، الفلاتر، التيربو، الحساسات، والسيور) لسيارات هيونداي وكيا والشاحنات الخفيفة.'
  },
  {
    q: 'ما هي مدة وخيارات الشحن والتوصيل للمدن خارج القصيم؟',
    a: 'نشحن لجميع مدن ومحافظات المملكة (الرياض، جدة، الدمام، مكة، المدينة، تبوك، أبها، حائل، إلخ) عبر أسرع شركات الشحن المعتمدة خلال 24 إلى 48 ساعة فقط.'
  },
  {
    q: 'هل تتوفر خيارات الدفع بالتقسيط بدون فوائد؟',
    a: 'نعم، نوفر خيارات التقسيط الميسر عبر تمارا وتابي في متجرنا الإلكتروني بدون أي فوائد أو رسوم إضافية، بالإضافة إلى الدفع ببطاقات مدى، فيزا، ماستركارد، وأبل باي.'
  }
];

export default function NationalDayLanding() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Extract UTM parameters for ad attribution
  const utmSource = searchParams.get('utm_source') || 'Direct-Ad';
  const utmCampaign = searchParams.get('utm_campaign') || 'NationalDay-KSA96';
  const utmMedium = searchParams.get('utm_medium') || 'social';

  // State
  const [copied, setCopied] = useState(false);
  const [activeBrandTab, setActiveBrandTab] = useState('hyundai');
  const [openFaq, setOpenFaq] = useState(null);

  // Quote Form State
  const [quoteForm, setQuoteForm] = useState({
    targetBranch: 'hyundai',
    carMake: 'هيونداي (Hyundai)',
    carModel: '',
    modelYear: '2022',
    engineType: 'بنزين ⛽',
    vinNumber: '',
    partsNeeded: '',
    customerName: '',
    customerPhone: ''
  });

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calculate Countdown
  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(CAMPAIGN_END_DATE) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Copy Coupon Handler with Confetti
  const handleCopyCoupon = (e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    
    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#ffffff', '#047857']
      });
    } catch (err) {
      console.log('Confetti error:', err);
    }

    toast({
      title: '✓ تم نسخ كود الخصم بنجاح!',
      description: `استخدم الكود (${COUPON_CODE}) في المتجر أو أرسله لمبيعات الفروع للحصول على الخصم الإضافي.`
    });

    setTimeout(() => setCopied(false), 3000);
  };

  // WhatsApp Message Generator
  const generateWhatsAppUrl = (type, customText = '') => {
    const contact = CONTACTS[type] || CONTACTS.hyundai;
    let message = '';

    if (customText) {
      message = customText;
    } else if (type === 'hyundai') {
      message = `🇸🇦 مرحباً درة السيارة (فرع هيونداي)\nأود الاستفسار عن عروض اليوم الوطني لقطع غيار هيونداي، وأرغب في الحصول على تسعير وخصم الكوبون [${COUPON_CODE}].\n\n📌 مصدر الطلب: ${utmSource} (${utmCampaign})`;
    } else if (type === 'kia') {
      message = `🇸🇦 مرحباً درة السيارة (فرع كيا)\nأود الاستفسار عن عروض اليوم الوطني لقطع غيار كيا، وأرغب في الحصول على تسعير وخصم الكوبون [${COUPON_CODE}].\n\n📌 مصدر الطلب: ${utmSource} (${utmCampaign})`;
    } else {
      message = `🇸🇦 مرحباً درة السيارة\nأود الاستفسار عن عروض اليوم الوطني والشحن، ولدي استفسار بخصوص كود الخصم [${COUPON_CODE}].\n\n📌 مصدر الطلب: ${utmSource} (${utmCampaign})`;
    }

    return `https://wa.me/${contact.cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Handle Quote Form Submit
  const handleQuoteSubmit = (e) => {
    e.preventDefault();

    if (!quoteForm.carModel || !quoteForm.partsNeeded) {
      toast({
        title: 'تنبيه',
        description: 'يرجى كتابة موديل السيارة والقطع المطلوبة للتسعير.',
        variant: 'destructive'
      });
      return;
    }

    const branch = CONTACTS[quoteForm.targetBranch] || CONTACTS.hyundai;
    
    // Construct rich formatted WhatsApp message
    const formattedMsg = 
`🇸🇦 *طلب تسعير ومطابقة هيكل (عروض اليوم الوطني)* 🇸🇦
----------------------------------------
🏬 *الفرع الموجه له:* ${branch.name}
🏷️ *كود خصم اليوم الوطني:* ${COUPON_CODE}

🚗 *بيانات السيارة:*
• الشركة: ${quoteForm.carMake}
• الموديل: ${quoteForm.carModel}
• سنة الصنع: ${quoteForm.modelYear}
• نوع المحرك: ${quoteForm.engineType}
• رقم الهيكل (VIN): ${quoteForm.vinNumber || 'سيتم إرسال صورة الاستمارة'}

🔧 *القطع المطلوبة:*
${quoteForm.partsNeeded}

👤 *بيانات العميل:*
• الاسم: ${quoteForm.customerName || 'عميل مميز'}
• رقم الجوال: ${quoteForm.customerPhone || 'مرفق بالمحادثة'}

📊 *مصدر الإعلان:* ${utmSource} | ${utmCampaign}
----------------------------------------
يرجى إفادتي بالتسعير وتطبيق خصم اليوم الوطني. شكراً لكم!`;

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#10b981', '#f59e0b', '#0284c7', '#7c3aed']
      });
    } catch (err) {}

    toast({
      title: '🚀 جاري تحويلك إلى واتساب الفرع...',
      description: `سيتم فتح محادثة مباشرة مع أخصائي مبيعات ${branch.name} لخدمتك فوراً.`
    });

    const waUrl = `https://wa.me/${branch.cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 600);
  };

  // Handle Bundle Direct Order
  const handleOrderBundle = (bundle) => {
    const text = 
`🇸🇦 *طلب باقة اليوم الوطني: [${bundle.title}]* 🇸🇦
----------------------------------------
🏷️ *السعر بعد الخصم:* ${bundle.price} ر.س (بدلاً من ${bundle.oldPrice} ر.س)
💰 *قيمة التوفير:* ${bundle.savings} ر.س
🎁 *كوبون الخصم:* ${COUPON_CODE}

📌 *المميزات المضمنة:*
${bundle.features.map(f => `• ${f}`).join('\n')}

يرجى تأكيد التوافر وتجهيز الطلب لسيارتي.
المصدر: ${utmSource} (${utmCampaign})`;

    const url = generateWhatsAppUrl('hyundai', text);
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#07121E] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
      
      {/* ─── 1. TOP TICKER / CAMPAIGN ANNOUNCEMENT BAR ────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 border-b border-emerald-500/30 px-3 py-2 text-center text-xs sm:text-sm font-bold text-emerald-200 flex items-center justify-center gap-2 sm:gap-4 flex-wrap sticky top-0 z-40 backdrop-blur-md">
        <span className="flex items-center gap-1.5 text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          🇸🇦 عروض اليوم الوطني الكبرى | تخفيضات تصل إلى <span className="text-amber-400 font-black text-sm sm:text-base">50%</span>
        </span>
        <span className="hidden md:inline text-emerald-400/60">•</span>
        <span className="hidden md:inline text-slate-200">
          على قطع غيار هيونداي وكيا (بنزين وديزل) + شحن مجاني لكافة مدن المملكة
        </span>
        <button
          onClick={handleCopyCoupon}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-black transition active:scale-95 shadow-sm"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>كود: {COUPON_CODE}</span>
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* ─── 2. MAIN HEADER & BRAND NAVIGATION ────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-[37px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          
          {/* Logo Brand: Free Floating, NO BOXES, Crisp 3D Metallic */}
          <Link to="/national-day" className="flex items-center gap-3 group">
            <img
              src="/company-logo.png"
              alt="شركة درة السيارة لقطع غيار السيارات"
              className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-heading font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
                درة السيارة
              </span>
              <span className="text-[10px] sm:text-xs text-emerald-400 font-semibold">
                قطع غيار هيونداي وكيا الأصلية
              </span>
            </div>
          </Link>

          {/* Quick Header Nav Channels */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold">
            <a
              href="#hyundai-branch"
              className="px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30 transition flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              فرع هيونداي (الرواف)
            </a>
            <a
              href="#kia-branch"
              className="px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              فرع كيا (السليم)
            </a>
            <a
              href="#online-store"
              className="px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              المتجر الإلكتروني
            </a>
            <a
              href="#vin-quote"
              className="px-3 py-2 rounded-xl text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1.5 font-black"
            >
              <Zap className="w-3.5 h-3.5" />
              تسعير رقم الهيكل VIN
            </a>
          </div>

          {/* Direct WhatsApp Callout Button */}
          <div className="flex items-center gap-2">
            <a
              href={generateWhatsAppUrl('hyundai')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>مبيعات الواتساب</span>
            </a>
          </div>

        </div>
      </header>

      {/* ─── 3. GRAND HERO SECTION WITH SAUDI THEME ───────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-emerald-500/20">
        
        {/* Ambient Glows */}
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-[-100px] w-[450px] h-[450px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-amber-600/15 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            
            {/* National Day Official Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold shadow-xl backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>🇸🇦 عروض اليوم الوطني السعودي | درة السيارة</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-amber-400 font-black">خصومات تصل إلى 50%</span>
            </div>

            {/* Grand Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight leading-[1.2] text-white">
              عِزّنا بخدمتكم.. عروض اليوم الوطني الكبرى
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-300">
                لقطع غيار هيونداي وكيا (بنزين وديزل)
              </span>
            </h1>

            {/* Sub-headline description */}
            <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
              احصل على أقوى تخفيضات العام على قطع الغيار الأصلية المعتمدة مع مطابقة رقم الهيكل (VIN) بنسبة 100%، وتوفر فوري بفرعينا في بريدة، أو عبر شحن سريع لكافة مدن ومحافظات المملكة.
            </p>

            {/* 1-Click Coupon Code & Countdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
              
              {/* Coupon Copier Card */}
              <div 
                onClick={handleCopyCoupon}
                className="p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400/60 shadow-xl backdrop-blur-md flex items-center justify-between gap-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-emerald-300 font-bold">كود خصم اليوم الوطني الإضافي</div>
                    <div className="font-mono font-black text-xl text-white tracking-widest">{COUPON_CODE}</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black h-9 px-3 gap-1.5 shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                </Button>
              </div>

              {/* Live Countdown Card */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl backdrop-blur-md flex flex-col justify-center items-center gap-1.5">
                <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ينتهي العرض الاستثنائي خلال:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 min-w-[44px]">
                    <span className="font-mono font-black text-lg text-amber-400">{String(timeLeft.days).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400">يوم</span>
                  </div>
                  <span className="text-amber-500 font-bold">:</span>
                  <div className="flex flex-col items-center bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 min-w-[44px]">
                    <span className="font-mono font-black text-lg text-amber-400">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400">ساعة</span>
                  </div>
                  <span className="text-amber-500 font-bold">:</span>
                  <div className="flex flex-col items-center bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 min-w-[44px]">
                    <span className="font-mono font-black text-lg text-amber-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400">دقيقة</span>
                  </div>
                  <span className="text-amber-500 font-bold">:</span>
                  <div className="flex flex-col items-center bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 min-w-[44px]">
                    <span className="font-mono font-black text-lg text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400">ثانية</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Hero CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <a
                href="#conversion-dynamo"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Flame className="w-5 h-5 fill-current text-slate-950" />
                <span>اختر فرعك وابدأ التسوق والخصم 🚀</span>
              </a>

              <a
                href="#vin-quote"
                className="px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm sm:text-base border border-slate-700 shadow-lg transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>طلب تسعير برقم الهيكل (VIN)</span>
              </a>
            </div>

            {/* Micro Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> قطع أصلية 100%
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> مطابقة برقم الهيكل
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-400" /> شحن لجميع مدن المملكة
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-400" /> تقسيط تمارا وتابي
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 4. THE DYNAMO: 3-WAY CONVERSION ENGINE ───────────────────────── */}
      <section id="conversion-dynamo" className="py-16 sm:py-24 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-bold">
              بوابات التحويل المباشر ⚡
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-white">
              محرك التحويلات: اختر وجهتك المفضلة
            </h2>
            <p className="text-xs sm:text-base text-slate-400">
              سواءً أردت الشراء المباشر من فرع هيونداي، فرع كيا، أو الطلب أونلاين والشحن لباب بيتك.. نحن في خدمتك بأقوى عروض اليوم الوطني.
            </p>
          </div>

          {/* 3 Main Dynamo Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* ── CARD 1: HYUNDAI BRANCH (الرواف) ────────────────────── */}
            <div 
              id="hyundai-branch"
              className="rounded-3xl border border-sky-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-sky-950/40 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-sky-400 transition-all duration-300 hover:shadow-sky-500/10"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-sky-500 to-indigo-600"></div>
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-105 transition">
                    🚗
                  </div>
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[11px] font-bold">
                    وكالة مبيعات هيونداي
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-white group-hover:text-sky-300 transition">
                    فرع هيونداي (طريق الرواف)
                  </h3>
                  <div className="text-xs text-sky-400 font-semibold mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>القصيم - بريدة - طريق الرواف</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    قسم متخصص بالكامل لجميع موديلات هيونداي (أكسنت، إلنترا، سوناتا، سنتافي، توسان، أزيرا، ستاريا، H100) لمنظومات الديزل والبنزين.
                  </p>
                </div>

                {/* Offer Highlights */}
                <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60 space-y-2 text-xs">
                  <div className="font-bold text-sky-200 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span>مزايا وعروض فرع هيونداي:</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    <li className="flex items-center gap-1.5">✓ خصم اليوم الوطني حتى 45% على الفلاتر والفرامل</li>
                    <li className="flex items-center gap-1.5">✓ توفر كامل قطع منظومة الديزل CRDi والبنزين</li>
                    <li className="flex items-center gap-1.5">✓ مطابقة رقم الهيكل فورية وتسليم فوري بالفرع</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-6 mt-4 border-t border-slate-800">
                <a
                  href={generateWhatsAppUrl('hyundai')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>تواصل واتساب مع مبيعات هيونداي</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${CONTACTS.hyundai.phone}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    <span>اتصال بالفرع</span>
                  </a>
                  <a
                    href={CONTACTS.hyundai.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>موقع الفرع 📍</span>
                  </a>
                </div>
              </div>
            </div>

            {/* ── CARD 2: KIA BRANCH (السليم) ────────────────────────── */}
            <div 
              id="kia-branch"
              className="rounded-3xl border border-purple-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-purple-950/40 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-purple-400 transition-all duration-300 hover:shadow-purple-500/10"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-rose-500"></div>
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-105 transition">
                    🚙
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[11px] font-bold">
                    وكالة مبيعات كيا
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-white group-hover:text-purple-300 transition">
                    فرع كيا (حي السليم)
                  </h3>
                  <div className="text-xs text-purple-400 font-semibold mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>القصيم - بريدة - حي السليم</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    مركز متكامل لقطع غيار كيا (سيراتو، K3، K5، سبورتاج، سورينتو، كارنفال، بيجاس، كادينزا، تيلورايد) الأصلية المعتمدة.
                  </p>
                </div>

                {/* Offer Highlights */}
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-2 text-xs">
                  <div className="font-bold text-purple-200 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span>مزايا وعروض فرع كيا:</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    <li className="flex items-center gap-1.5">✓ خصومات باقات الصيانة والمساعدات حتى 50%</li>
                    <li className="flex items-center gap-1.5">✓ توفر كامل قطع كيا الأصلية ديزل وبنزين</li>
                    <li className="flex items-center gap-1.5">✓ كادر فني خبير لمطابقة القطع بدقة متناهية</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-6 mt-4 border-t border-slate-800">
                <a
                  href={generateWhatsAppUrl('kia')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>تواصل واتساب مع مبيعات كيا</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${CONTACTS.kia.phone}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    <span>اتصال بالفرع</span>
                  </a>
                  <a
                    href={CONTACTS.kia.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>موقع الفرع 📍</span>
                  </a>
                </div>
              </div>
            </div>

            {/* ── CARD 3: ONLINE STORE & NATIONWIDE SHIPPING ────────── */}
            <div 
              id="online-store"
              className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-emerald-950/40 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-emerald-400 transition-all duration-300 hover:shadow-emerald-500/10"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400"></div>
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-105 transition">
                    🛒
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold">
                    المتجر الإلكتروني 24/7
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-white group-hover:text-emerald-300 transition">
                    متجر درة السيارة أونلاين
                  </h3>
                  <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    <span>شحن سريع لجميع مدن ومحافظات المملكة</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    تصفح أكثر من 15,000 قطعة غيار أصلية، ادفع بالتقسيط مع تمارا وتابي، واستمتع بتوصيل فوري لباب منزلك أو ورشتك.
                  </p>
                </div>

                {/* Offer Highlights */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-2 text-xs">
                  <div className="font-bold text-emerald-200 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>مزايا المتجر الإلكتروني:</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    <li className="flex items-center gap-1.5">✓ كود الخصم الإضافي: <strong className="text-amber-400 font-mono font-black">{COUPON_CODE}</strong></li>
                    <li className="flex items-center gap-1.5">✓ شحن مجاني للطلبات فوق 300 ريال</li>
                    <li className="flex items-center gap-1.5">✓ تقسيط على 4 دفعات بدون فوائد (تمارا / تابي)</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-6 mt-4 border-t border-slate-800">
                <a
                  href={CONTACTS.store.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>تسوق الآن بالمتجر الإلكتروني 🛍️</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyCoupon}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>نسخ كود الخصم</span>
                  </button>
                  <a
                    href={generateWhatsAppUrl('store')}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>استفسار المتجر</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 5. INTERACTIVE VIN DIRECT QUOTE ENGINE ───────────────────────── */}
      <section id="vin-quote" className="py-16 sm:py-24 border-y border-slate-800 bg-[#091726] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-10">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-bold">
              مطابقة فورية 100% 🎯
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-white">
              اطلب تسعير قطع غيارك برقم الهيكل (VIN)
            </h2>
            <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto">
              أرسل بيانات سيارتك ورقم الهيكل لتحصل على تسعير فوري مع خصم اليوم الوطني المعتمد مباشرة عبر الواتساب من الفرع المختص.
            </p>
          </div>

          {/* Form Card */}
          <Card className="p-6 sm:p-10 rounded-3xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl text-slate-100">
            <form onSubmit={handleQuoteSubmit} className="space-y-6">
              
              {/* Branch Selection Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">اختر الفرع المفضل لطلب التسعير *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteForm({ ...quoteForm, targetBranch: 'hyundai', carMake: 'هيونداي (Hyundai)' })}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 border ${quoteForm.targetBranch === 'hyundai' ? 'bg-sky-600/30 border-sky-400 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <span>🚗 فرع هيونداي</span>
                    <span className="text-[10px] text-sky-400 font-normal">طريق الرواف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuoteForm({ ...quoteForm, targetBranch: 'kia', carMake: 'كيا (Kia)' })}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 border ${quoteForm.targetBranch === 'kia' ? 'bg-purple-600/30 border-purple-400 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <span>🚙 فرع كيا</span>
                    <span className="text-[10px] text-purple-400 font-normal">حي السليم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuoteForm({ ...quoteForm, targetBranch: 'store' })}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 border ${quoteForm.targetBranch === 'store' ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <span>🛒 المتجر أونلاين</span>
                    <span className="text-[10px] text-emerald-400 font-normal">شحن للمنزل</span>
                  </button>
                </div>
              </div>

              {/* Car Make & Model & Engine Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Make */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">الشركة الصانعة *</label>
                  <select
                    value={quoteForm.carMake}
                    onChange={(e) => setQuoteForm({ ...quoteForm, carMake: e.target.value })}
                    className="w-full h-11 rounded-2xl bg-slate-950 border border-slate-700 px-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="هيونداي (Hyundai)">هيونداي (Hyundai)</option>
                    <option value="كيا (Kia)">كيا (Kia)</option>
                    <option value="شاحنات وباصات كورية">شاحنات وباصات كورية</option>
                  </select>
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">الموديل *</label>
                  <Input
                    placeholder="مثال: سوناتا، سبورتاج، إلنترا..."
                    value={quoteForm.carModel}
                    onChange={(e) => setQuoteForm({ ...quoteForm, carModel: e.target.value })}
                    className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">سنة الصنع *</label>
                  <select
                    value={quoteForm.modelYear}
                    onChange={(e) => setQuoteForm({ ...quoteForm, modelYear: e.target.value })}
                    className="w-full h-11 rounded-2xl bg-slate-950 border border-slate-700 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Engine Type & VIN Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Engine */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">نوع المحرك *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuoteForm({ ...quoteForm, engineType: 'بنزين ⛽' })}
                      className={`h-11 rounded-2xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${quoteForm.engineType.includes('بنزين') ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span>⛽ بنزين (Petrol)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteForm({ ...quoteForm, engineType: 'ديزل 🛢️' })}
                      className={`h-11 rounded-2xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${quoteForm.engineType.includes('ديزل') ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-black' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span>🛢️ ديزل (Diesel CRDi)</span>
                    </button>
                  </div>
                </div>

                {/* VIN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>رقم الهيكل VIN (17 خانة)</span>
                    <span className="text-[10px] text-amber-400">أو تصوير الاستمارة</span>
                  </label>
                  <Input
                    placeholder="مثال: KMHD841B..."
                    value={quoteForm.vinNumber}
                    onChange={(e) => setQuoteForm({ ...quoteForm, vinNumber: e.target.value.toUpperCase() })}
                    className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-xs text-white font-mono uppercase tracking-wider"
                  />
                </div>

              </div>

              {/* Parts Needed */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">قائمة القطع المطلوبة للتسعير *</label>
                <Textarea
                  placeholder="اكتب القطع التي تحتاجها (مثال: طقم فحمات أمامية وخلفية، فلتر هواء وزيت، مساعدات أمامية، طرمبة ديزل...)"
                  value={quoteForm.partsNeeded}
                  onChange={(e) => setQuoteForm({ ...quoteForm, partsNeeded: e.target.value })}
                  className="rounded-2xl bg-slate-950 border-slate-700 text-xs text-white min-h-[90px]"
                  required
                />
              </div>

              {/* Customer Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">اسمك الكريم</label>
                  <Input
                    placeholder="الاسم"
                    value={quoteForm.customerName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerName: e.target.value })}
                    className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">رقم الجوال (اختياري)</label>
                  <Input
                    placeholder="05xxxxxxxx"
                    value={quoteForm.customerPhone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerPhone: e.target.value })}
                    className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all gap-2"
              >
                <Zap className="w-5 h-5 text-slate-950 fill-current" />
                <span>إرسال طلب التسعير والحصول على خصم اليوم الوطني 🚀</span>
              </Button>

              <div className="text-center text-[11px] text-slate-400">
                🔒 سيتم فتح محادثة فورية مع أخصائي مبيعات الفرع المختص، مطابقة مجانية 100% برقم الهيكل.
              </div>

            </form>
          </Card>

        </div>
      </section>

      {/* ─── 6. NATIONAL DAY EXCLUSIVE VALUE BUNDLES ──────────────────────── */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-12 sm:mb-16">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-bold">
              توفير وطني فائق 🇸🇦
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-white">
              باقات اليوم الوطني الحصرية
            </h2>
            <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
              باقات متكاملة مجهزة مسبقاً بأعلى مواصفات الجودة والأصالة وبأسعار مخفضة حصرياً خلال فترة اليوم الوطني.
            </p>
          </div>

          {/* Bundles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROMO_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className={`rounded-3xl border ${bundle.border} bg-gradient-to-b ${bundle.bgGradient} p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
              >
                <div className="space-y-4">
                  
                  {/* Top Tag & Discount */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-amber-300 border border-slate-700">
                      {bundle.tag}
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-600 text-white shadow">
                      خصم {bundle.discount}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-black text-lg text-white group-hover:text-emerald-300 transition">
                      {bundle.title}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">{bundle.brand}</div>
                  </div>

                  {/* Pricing Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 line-through font-mono">{bundle.oldPrice} ر.س</div>
                      <div className="text-xl font-black font-mono text-emerald-400">{bundle.price} <span className="text-xs font-sans">ر.س</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-amber-400 font-bold">وفرت معنا:</div>
                      <div className="font-mono font-black text-amber-300 text-sm">+{bundle.savings} ر.س</div>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 text-xs text-slate-300 pt-1">
                    {bundle.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                </div>

                {/* Order Button */}
                <div className="pt-6 mt-6 border-t border-slate-800/80">
                  <Button
                    onClick={() => handleOrderBundle(bundle)}
                    className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>طلب الباقة عبر الواتساب</span>
                  </Button>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── 7. INTERACTIVE KOREAN VEHICLES SHOWCASE ──────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#081524] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-10">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs px-3 py-1 font-bold">
              تغطية شاملة للموديلات الكورية 🚘
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-white">
              قطع غيار سياراتك الكورية متوفرة بالكامل
            </h2>
            <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
              اختر شركتك المفضلة وتعرف على الموديلات المدعومة بالكامل بنظام الديزل والبنزين.
            </p>

            {/* Brand Switcher */}
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 gap-2 mt-4">
              <button
                onClick={() => setActiveBrandTab('hyundai')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${activeBrandTab === 'hyundai' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <span>🚗 سيارات هيونداي (Hyundai)</span>
              </button>
              <button
                onClick={() => setActiveBrandTab('kia')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${activeBrandTab === 'kia' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <span>🚙 سيارات كيا (Kia)</span>
              </button>
            </div>
          </div>

          {/* Vehicle Models Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {POPULAR_MODELS[activeBrandTab].map((car, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group shadow-sm hover:shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {car.years}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeBrandTab === 'hyundai' ? 'bg-sky-500/20 text-sky-300' : 'bg-purple-500/20 text-purple-300'}`}>
                      {car.badge}
                    </span>
                  </div>

                  <h4 className="font-heading font-black text-base text-white group-hover:text-emerald-400 transition">
                    {car.name}
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    <span>المحركات: {car.engines}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800">
                  <a
                    href={generateWhatsAppUrl(activeBrandTab, `🇸🇦 مرحباً درة السيارة، أرغب في تسعير قطع غيار لسيارة (${car.name}) موديل (${car.years}) مع خصم اليوم الوطني.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition group-hover:bg-emerald-600 group-hover:text-white"
                  >
                    <span>طلب قطع للموديل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── 8. TRUST, AUTHENTICITY & OFFICIAL CREDENTIALS ────────────────── */}
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-2xl">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              
              <div className="space-y-4">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-bold">
                  ضمان واعتماد رسمي ✓
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-heading font-black text-white">
                  لماذا يثق بنا أكثر من 25,000 عميل في المملكة؟
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  شركة درة السيارة منشأة سعودية رسمية مسجلة متخصصة في استيراد وتوزيع قطع غيار هيونداي وكيا الأصلية والمعتمدة، مع التزام تام بالمعايير والمواصفات القياسية.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">السجل التجاري:</span>
                    <strong className="text-emerald-400 font-mono font-bold text-sm">7016475555</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">الرقم الضريبي:</span>
                    <strong className="text-emerald-400 font-mono font-bold text-sm">311861381500003</strong>
                  </div>
                </div>
              </div>

              {/* Trust Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">+15,000</div>
                  <div className="text-xs font-bold text-slate-200">صنف وقطعة أصلية</div>
                  <div className="text-[10px] text-slate-400">متوفرة للتسليم والشحن الفوري</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">100%</div>
                  <div className="text-xs font-bold text-slate-200">مطابقة رقم الهيكل</div>
                  <div className="text-[10px] text-slate-400">كتالوجات الوكالة المعتمدة</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400">+45</div>
                  <div className="text-xs font-bold text-slate-200">مدينة ومحافظة</div>
                  <div className="text-[10px] text-slate-400">نغطيها بالشحن السريع</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">2 فرع + متجر</div>
                  <div className="text-xs font-bold text-slate-200">فروعنا بخدمتكم</div>
                  <div className="text-[10px] text-slate-400">الرواف + السليم + أونلاين</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── 9. FAQ ACCORDION ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-slate-950/60 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-10">
            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs px-3 py-1 font-bold">
              إجابات سريعة ❓
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
              الأسئلة الشائعة حول عروض اليوم الوطني
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-4 hover:bg-slate-800/40 transition"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 bg-slate-950/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─── 10. FOOTER ──────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <img
              src="/company-logo.png"
              alt="درة السيارة"
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="font-heading font-black text-white text-sm">شركة درة السيارة لقطع غيار السيارات</div>
              <div className="text-[11px] text-slate-500">الوكيل المتخصص لقطع غيار هيونداي وكيا (بنزين وديزل)</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <a href="#hyundai-branch" className="hover:text-white transition">فرع هيونداي</a>
            <span>•</span>
            <a href="#kia-branch" className="hover:text-white transition">فرع كيا</a>
            <span>•</span>
            <a href="#online-store" className="hover:text-white transition">المتجر الإلكتروني</a>
            <span>•</span>
            <a href="#vin-quote" className="hover:text-white transition">تسعير VIN</a>
          </div>

          <div className="text-center sm:text-left text-[11px] text-slate-500">
            جميع الحقوق محفوظة © {new Date().getFullYear()} درة السيارة
          </div>

        </div>
      </footer>

      {/* ─── 11. FLOATING STICKY MOBILE CONVERSION BAR ────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 border-t border-slate-800 p-2 sm:hidden backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-4 gap-1.5">
          
          {/* Hyundai Branch WhatsApp */}
          <a
            href={generateWhatsAppUrl('hyundai')}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold shadow active:scale-95 transition"
          >
            <MessageCircle className="w-4 h-4 mb-0.5 fill-current" />
            <span>فرع هيونداي</span>
          </a>

          {/* Kia Branch WhatsApp */}
          <a
            href={generateWhatsAppUrl('kia')}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow active:scale-95 transition"
          >
            <MessageCircle className="w-4 h-4 mb-0.5 fill-current" />
            <span>فرع كيا</span>
          </a>

          {/* Store */}
          <a
            href={CONTACTS.store.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-black shadow active:scale-95 transition"
          >
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            <span>المتجر أونلاين</span>
          </a>

          {/* VIN Quote Scroll */}
          <a
            href="#vin-quote"
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 active:scale-95 transition"
          >
            <Zap className="w-4 h-4 mb-0.5" />
            <span>تسعير VIN</span>
          </a>

        </div>
      </div>

    </div>
  );
}
