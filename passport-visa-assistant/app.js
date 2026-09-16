/**
 * Passport Visa Assistant - Main App Logic
 * Calibrated 100% for Saudi Visa Platforms (طلب زيارة عائلية للمقيمين - منصة التأشيرات ksa.visa)
 * 100% Offline, Zero Cloud Uploads, Secure Local Execution
 */

// Global App State
const state = {
  currentRecord: null,
  familyMembers: [], // Multi-person queue for "المطلوبين للزيارة"
  selectedMemberId: null,
  activeTab: 'tasheer', // 'tasheer' | 'enjaz'
  activePlatform: 'family_visit', // 'family_visit' | 'enjaz' | 'tasheer'
  sequentialIndex: 0,
  sequentialActive: false,
  dateFormat: 'YMD', // Default for ksa.visa is YYYY/MM/DD or YYYY-MM-DD
  vaultRecords: []
};

// ─── EXACT SEQUENCES MATCHING SAUDI MOFA FAMILY VISIT MODAL ─────────────────
const FAMILY_VISIT_SEQUENCE = [
  { key: 'nationalityAr', label: 'الجنسية', note: 'اختر الجنسية' },
  { key: 'firstNameAr', label: 'الاسم الأول (عربي)', note: 'الاسم الأول' },
  { key: 'fatherNameAr', label: 'الأب (عربي)', note: 'اسم الأب' },
  { key: 'grandFatherNameAr', label: 'الجد (عربي)', note: 'اسم الجد' },
  { key: 'familyNameAr', label: 'العائلة (عربي)', note: 'اسم العائلة' },
  { key: 'firstNameEn', label: 'الاسم الأول (إنجليزي)', note: 'First Name' },
  { key: 'fatherNameEn', label: 'الأب (إنجليزي)', note: 'Father Name' },
  { key: 'grandFatherNameEn', label: 'الجد (إنجليزي)', note: 'Grandfather Name' },
  { key: 'familyNameEn', label: 'العائلة (إنجليزي)', note: 'Family Name' },
  { key: 'dobFormatted', label: 'تاريخ الميلاد', note: 'ميلادي YYYY/MM/DD' },
  { key: 'pob', label: 'محل الميلاد', note: 'المحافظة / المدينة' },
  { key: 'religion', label: 'الديانة', note: 'مسلم' },
  { key: 'profession', label: 'المهنة', note: 'ربة منزل / طالب / طفل' },
  { key: 'sex', label: 'الجنس', note: 'ذكر / أنثى' },
  { key: 'relation', label: 'صلة القرابة', note: 'زوجة / ابن / ابنة / والدة' },
  { key: 'phone', label: 'رقم الجوال', note: 'رقم الاتصال' },
  { key: 'email', label: 'البريد الالكتروني', note: 'البريد' },
  { key: 'passportNumber', label: 'رقم جواز السفر', note: 'رقم الجواز' },
  { key: 'docType', label: 'نوع الجواز', note: 'عادي' },
  { key: 'doiFormatted', label: 'تاريخ إصدار الجواز', note: 'تاريخ الإصدار' },
  { key: 'doeFormatted', label: 'تاريخ إنتهاء الجواز', note: 'تاريخ الانتهاء' },
  { key: 'placeOfIssue', label: 'مكان إصدار جواز السفر', note: 'محل الإصدار' },
  { key: 'arrivalPort', label: 'جهة القدوم', note: 'القاهرة / الإسكندرية / عمان' },
  { key: 'visitPurpose', label: 'الغرض من الزيارة', note: 'زيارة عائلية' },
  { key: 'entriesCount', label: 'عدد مرات الدخول', note: 'عدة سفرات / سفرة واحدة' },
  { key: 'stayDuration', label: 'مدة الإقامة باليوم', note: '90 يوم / 30 يوم' }
];

const TASHEER_SEQUENCE = [
  { key: 'passportNumber', label: 'رقم الجواز', note: 'Passport No' },
  { key: 'nationalityEn', label: 'الجنسية (EN)', note: 'Nationality' },
  { key: 'dobFormatted', label: 'تاريخ الميلاد', note: 'Date of Birth' },
  { key: 'fullNameEn', label: 'الاسم الكامل إنجليزي', note: 'Full Name' },
  { key: 'doeFormatted', label: 'تاريخ الانتهاء', note: 'Expiry Date' },
  { key: 'sexEn', label: 'الجنس (EN)', note: 'Gender' },
  { key: 'placeOfIssue', label: 'مكان الإصدار', note: 'Issuing Place' }
];

// ─── EXACT SEQUENCES MATCHING SAUDI MOFA ENJAZ PORTAL (إنجاز) ─────────────────
const ENJAZ_SEQUENCE = [
  // 1. بيانات التأشيرة
  { key: 'visaType', label: 'نوع التأشيرة', note: 'زيارة عائلية' },
  { key: 'docNumber', label: 'رقم المستند', note: 'رقم المستند 7011172155' },
  { key: 'nationalityAr', label: 'الجنسية الحالية', note: 'مصر' },
  { key: 'residenceCountry', label: 'بلد الإقامة', note: 'مصر' },
  { key: 'closestMission', label: 'أقرب ممثلية', note: 'الاسكندرية / القاهرة' },
  // 2. الأسماء الرباعية
  { key: 'firstNameAr', label: 'الاسم الأول (عربي)', note: 'الاسم الأول' },
  { key: 'fatherNameAr', label: 'الأب (عربي)', note: 'اسم الأب' },
  { key: 'grandFatherNameAr', label: 'الجد (عربي)', note: 'اسم الجد' },
  { key: 'familyNameAr', label: 'العائلة (عربي)', note: 'اسم العائلة' },
  { key: 'firstNameEn', label: 'First Name *', note: 'First Name' },
  { key: 'fatherNameEn', label: 'Second/Father Name', note: 'Father Name' },
  { key: 'grandFatherNameEn', label: 'Other/G.Father Name', note: 'Grandfather Name' },
  { key: 'familyNameEn', label: 'Last/Family Name *', note: 'Family Name' },
  // 3. بيانات الجواز والهوية والشخصية
  { key: 'passportNumber', label: 'رقم الجواز *', note: 'رقم الجواز' },
  { key: 'docType', label: 'نوع الجواز *', note: 'عادي' },
  { key: 'placeOfIssue', label: 'دولة الاصدار *', note: 'مصر' },
  { key: 'doiFormatted', label: 'تاريخ الاصدار (البداية) *', note: 'تاريخ إصدار الجواز' },
  { key: 'doeFormatted', label: 'تاريخ الانتهاء (النهاية) *', note: 'تاريخ انتهاء الجواز' },
  { key: 'pob', label: 'مكان الميلاد *', note: 'مكان الميلاد' },
  { key: 'dobFormatted', label: 'تاريخ الميلاد *', note: 'تاريخ الميلاد' },
  { key: 'nationalId', label: 'رقم الهوية', note: 'الرقم القومي / الهوية' },
  { key: 'religion', label: 'الديانة *', note: 'مسلم' },
  { key: 'maritalStatus', label: 'الحالة الاجتماعية *', note: 'متزوج / أعزب' },
  { key: 'sex', label: 'الجنس *', note: 'ذكر / أنثى' },
  { key: 'employmentStatus', label: 'الحالة المهنية *', note: 'لا يعمل' },
  { key: 'profession', label: 'المهنة *', note: 'ربة منزل / طفله' },
  { key: 'saudiAddress', label: 'عنوان السكن داخل السعودية *', note: 'العنوان بالسعودية' },
  { key: 'relation', label: 'صلة القرابة *', note: 'زوجة / بنت' },
  { key: 'phoneCountryCode', label: 'رمز الدولة', note: '+966 / +20' },
  { key: 'phone', label: 'رقم الجوال *', note: 'رقم الجوال' },
  { key: 'email', label: 'البريد الإلكتروني', note: 'sayedabdo8888@gmail.com' },
  // 4. بيانات الرحلة والوصول
  { key: 'carrier', label: 'الناقل', note: 'جوا' },
  { key: 'arrivalPort', label: 'جهة الوصول', note: 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم' },
  { key: 'expectedArrivalDate', label: 'التاريخ المتوقع لدخولك المملكة *', note: '2026/09/30' },
  { key: 'visitPurpose', label: 'الغرض', note: 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار' },
  { key: 'flightNumber', label: 'رقم الرحلة', note: 'رقم الرحلة' }
];

// Audio Feedback (Web Audio API - 100% Offline)
function playHapticBeep(freq = 750, type = 'sine', duration = 0.04) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

// Clipboard copy helper
function copyToClipboard(text, fieldLabel = '') {
  if (text === undefined || text === null) text = '';
  const cleanText = String(text).trim();

  function onSuccess() {
    playHapticBeep(850, 'sine', 0.05);
    showToast(`تم نسخ: ${fieldLabel || cleanText}`, 'success');
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanText).then(onSuccess).catch(() => {
      fallbackCopy(cleanText, onSuccess);
    });
  } else {
    fallbackCopy(cleanText, onSuccess);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    if (cb) cb();
  } catch (err) {
    showToast('فشل النسخ تلقائياً', 'error');
  }
  document.body.removeChild(ta);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-700 text-white shadow-emerald-500/30' :
                  type === 'error' ? 'bg-rose-700 text-white shadow-rose-500/30' :
                  'bg-slate-900 text-white shadow-slate-900/40';

  toast.className = `flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span><span>${msg}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// ─── ACTIVE VISA CONTEXT (بيانات الطلب الثابتة المشتركة لكافة الجوازات) ───────
function getActiveVisaContext() {
  const docNum = getElVal('ej_docNumber') || getElVal('req_visaNumber') || (state.currentRecord && state.currentRecord.docNumber) || '7011172155';
  const reqName = getElVal('req_name') || 'السيد عبدالمنعم السيد بصار';
  const visitPurpose = getElVal('ej_visitPurpose') || getElVal('f_visitPurpose') || (state.currentRecord && state.currentRecord.visitPurpose) || ('زيارة عائلية لـ ' + reqName);
  const email = getElVal('ej_email') || getElVal('req_email') || (state.currentRecord && state.currentRecord.email) || 'sayedabdo8888@gmail.com';
  const phone = getElVal('ej_phone') || getElVal('req_phone') || (state.currentRecord && state.currentRecord.phone) || '0582625697';
  const saudiAddress = getElVal('ej_saudiAddress') || getElVal('req_address') || (state.currentRecord && state.currentRecord.saudiAddress) || 'جده';
  const carrier = getElVal('ej_carrier') || (state.currentRecord && state.currentRecord.carrier) || 'جوا';
  const arrivalPort = getElVal('ej_arrivalPort') || getElVal('f_arrivalPort') || (state.currentRecord && state.currentRecord.arrivalPort) || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
  const expectedArrivalDate = getElVal('ej_expectedArrivalDate') || (state.currentRecord && state.currentRecord.expectedArrivalDate) || '2026/09/30';
  const closestMission = getElVal('ej_closestMission') || 'الاسكندرية';
  const religion = 'مسلم';
  const nationalityAr = 'مصر';
  const entriesCount = getElVal('f_entriesCount') || (state.currentRecord && state.currentRecord.entriesCount) || '';
  const stayDuration = getElVal('f_stayDuration') || (state.currentRecord && state.currentRecord.stayDuration) || '';

  return {
    docNum,
    reqName,
    visitPurpose,
    email,
    phone,
    saudiAddress,
    carrier,
    arrivalPort,
    expectedArrivalDate,
    closestMission,
    religion,
    nationalityAr,
    entriesCount,
    stayDuration
  };
}

function applyActiveVisaContext(rec) {
  if (!rec) return rec;
  const ctx = getActiveVisaContext();

  rec.docNumber = ctx.docNum;
  rec.visitPurpose = ctx.visitPurpose;
  rec.email = ctx.email;
  rec.phone = ctx.phone;
  rec.saudiAddress = ctx.saudiAddress;
  rec.carrier = ctx.carrier || 'جوا';
  rec.arrivalPort = ctx.arrivalPort || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
  rec.expectedArrivalDate = ctx.expectedArrivalDate || '2026/09/30';
  rec.closestMission = ctx.closestMission || 'الاسكندرية';
  rec.religion = rec.religion || ctx.religion;
  rec.nationalityAr = rec.nationalityAr || ctx.nationalityAr;
  rec.residenceCountry = rec.residenceCountry || ctx.nationalityAr;
  rec.visaType = rec.visaType || 'زيارة عائلية';
  rec.entriesCount = rec.entriesCount || ctx.entriesCount;
  rec.stayDuration = rec.stayDuration || ctx.stayDuration;

  // إنجاز: حالة العمل دائماً "لا يعمل" للزوجة والأبناء
  rec.employmentStatus = 'لا يعمل';
  rec.isUnemployed = true;

  // تحديد ذكي لصلة القرابة والمهنة استناداً للجنس والعمر والمسجلين حالياً
  let birthYear = 0;
  if (rec.dobIso && rec.dobIso.length >= 4) {
    birthYear = parseInt(rec.dobIso.substring(0, 4), 10);
  } else if (rec.dobDmy && rec.dobDmy.length >= 10) {
    birthYear = parseInt(rec.dobDmy.substring(6, 10), 10);
  }
  const currentYear = new Date().getFullYear();
  const age = birthYear > 0 ? (currentYear - birthYear) : 25;

  if (rec.sex === 'أنثى' || rec.sexEn === 'Female') {
    rec.sex = 'أنثى';
    rec.sexEn = 'Female';
    const hasWifeAlready = state.familyMembers.some(m => m.id !== rec.id && (m.relation === 'زوجة' || m.relation === 'زوجه'));
    if (hasWifeAlready || age < 18) {
      rec.relation = 'بنت';
      if (age < 7) rec.profession = 'طفله';
      else if (age < 23) rec.profession = 'طالبة';
      else rec.profession = 'بدون عمل';
    } else {
      rec.relation = 'زوجة';
      rec.profession = 'ربة منزل';
    }
  } else {
    rec.sex = 'ذكر';
    rec.sexEn = 'Male';
    rec.relation = 'ابن';
    if (age < 7) rec.profession = 'طفل';
    else if (age < 23) rec.profession = 'طالب';
    else rec.profession = 'بدون عمل';
  }

  // حساب تواريخ الإصدار والانتهاء بدقة إذا كانت مفقودة
  if (!rec.doiIso && rec.doeIso && rec.doeIso.length >= 4) {
    const doeY = parseInt(rec.doeIso.substring(0, 4), 10);
    const validityYears = rec.nationalityCode === 'EGY' ? 7 : 5;
    const doiY = doeY - validityYears;
    const rest = rec.doeIso.substring(4);
    rec.doiIso = `${doiY}${rest}`;
    if (rec.doeDmy && rec.doeDmy.length >= 10) {
      rec.doeDmy = `${rec.doeDmy.substring(0, 6)}${doiY}`;
    }
  }

  return rec;
}

// ─── PASSPORT RECORD FACTORY ─────────────────────────────────────────────────
function createEmptyRecord() {
  const ctx = getActiveVisaContext();
  return {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    status: 'جديد',
    // Document
    passportNumber: '',
    docType: 'عادي',
    doiIso: '',
    doiDmy: '',
    doiHijri: '',
    doeIso: '',
    doeDmy: '',
    doeHijri: '',
    placeOfIssue: 'مصر',
    // Names
    firstNameAr: '',
    fatherNameAr: '',
    grandFatherNameAr: '',
    familyNameAr: '',
    fullNameAr: '',
    firstNameEn: '',
    fatherNameEn: '',
    grandFatherNameEn: '',
    familyNameEn: '',
    fullNameEn: '',
    // Personal
    nationalityCode: 'EGY',
    nationalityAr: ctx.nationalityAr,
    nationalityEn: 'Egypt',
    dobIso: '',
    dobDmy: '',
    dobHijri: '',
    pob: 'مصر',
    religion: ctx.religion,
    profession: 'ربة منزل',
    isUnemployed: true,
    sex: 'أنثى',
    sexEn: 'Female',
    relation: 'زوجة',
    phone: ctx.phone,
    email: ctx.email,
    // Enjaz Specific Fields (مطابقة 100% لسكرين شوت إنجاز)
    visaType: 'زيارة عائلية',
    residenceCountry: 'مصر',
    closestMission: ctx.closestMission,
    docNumber: ctx.docNum,
    hasPreviousNationality: 'لا',
    previousNationality: '',
    nationalId: '',
    maritalStatus: 'متزوج',
    employmentStatus: 'لا يعمل',
    saudiAddress: ctx.saudiAddress,
    phoneCountryCode: '+966',
    carrier: ctx.carrier,
    expectedArrivalDate: ctx.expectedArrivalDate,
    flightNumber: '',
    photoDataUrl: '',
    // Visit Details
    arrivalPort: ctx.arrivalPort,
    visitPurpose: ctx.visitPurpose,
    entriesCount: ctx.entriesCount,
    stayDuration: ctx.stayDuration,
    visaPeriod: '',
    personalNumber: '',
    mrzRaw: ''
  };
}

function recordFromParsedMRZ(parsed) {
  const rec = createEmptyRecord();
  if (!parsed) return rec;

  rec.passportNumber = parsed.passportNumber || '';
  rec.docType = 'عادي';
  rec.nationalityCode = parsed.nationalityCode || 'EGY';
  rec.nationalityAr = parsed.nationalityAr || 'مصر';
  rec.nationalityEn = parsed.nationalityEn || 'Egypt';
  rec.personalNumber = parsed.personalNumber || '';
  rec.nationalId = parsed.personalNumber || '';

  // Names
  rec.firstNameEn = parsed.firstNameEn || '';
  rec.fatherNameEn = parsed.fatherNameEn || '';
  rec.grandFatherNameEn = parsed.grandFatherNameEn || '';
  rec.familyNameEn = parsed.familyNameEn || '';
  rec.fullNameEn = parsed.fullNameEn || '';

  rec.firstNameAr = parsed.firstNameAr || '';
  rec.fatherNameAr = parsed.fatherNameAr || '';
  rec.grandFatherNameAr = parsed.grandFatherNameAr || '';
  rec.familyNameAr = parsed.familyNameAr || '';
  rec.fullNameAr = parsed.fullNameAr || '';

  // Dates
  if (parsed.dob) {
    rec.dobIso = parsed.dob.iso.replace(/-/g, '/');
    rec.dobDmy = parsed.dob.dmy;
    rec.dobHijri = parsed.dobHijri ? parsed.dobHijri.dmy : '';
  }

  if (parsed.doe) {
    rec.doeIso = parsed.doe.iso.replace(/-/g, '/');
    rec.doeDmy = parsed.doe.dmy;
    rec.doeHijri = parsed.doeHijri ? parsed.doeHijri.dmy : '';

    // Calculate approximate Issue Date
    if (parsed.doe.year) {
      const validityYears = parsed.nationalityCode === 'EGY' ? 7 : (parsed.nationalityCode === 'SAU' ? 10 : 5);
      const doiYear = parsed.doe.year - validityYears;
      const mmPad = String(parsed.doe.month).padStart(2, '0');
      const ddPad = String(parsed.doe.day).padStart(2, '0');
      rec.doiIso = `${doiYear}/${mmPad}/${ddPad}`;
      rec.doiDmy = `${ddPad}/${mmPad}/${doiYear}`;
      const doiHijri = gregorianToHijri(doiYear, parsed.doe.month, parsed.doe.day);
      rec.doiHijri = doiHijri ? doiHijri.dmy : '';
    }
  }

  rec.sex = parsed.sex || 'أنثى';
  rec.sexEn = parsed.sexEn || 'Female';
  rec.personalNumber = parsed.personalNumber || '';
  rec.mrzRaw = parsed.rawLines ? parsed.rawLines.join('\n') : '';

  // Apply shared active visa context (رقم المستند، الغرض، جهة القدوم، الناقل، الإيميل، الهاتف، لا يعمل، صلة القرابة)
  applyActiveVisaContext(rec);

  return enrichWithKnownFamilyData(rec);
}

function enrichWithKnownFamilyData(rec) {
  if (!rec) return rec;
  rec.visitPurpose = rec.visitPurpose || 'زيارة عائلية';
  if (!rec.passportNumber) return rec;

  const known = typeof BESSAR_FAMILY_RECORDS !== 'undefined' 
    ? BESSAR_FAMILY_RECORDS.find(k => k.passportNumber === rec.passportNumber)
    : null;

  if (known) {
    rec.firstNameAr = known.firstNameAr;
    rec.fatherNameAr = known.fatherNameAr;
    rec.grandFatherNameAr = known.grandFatherNameAr;
    rec.familyNameAr = known.familyNameAr;
    rec.fullNameAr = known.fullNameAr;
    rec.profession = known.profession;
    rec.relation = known.relation;
    rec.visitPurpose = known.visitPurpose || 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار';
    rec.carrier = known.carrier || 'جوا';
    rec.arrivalPort = known.arrivalPort || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
    rec.expectedArrivalDate = known.expectedArrivalDate || '2026/09/30';
    rec.pob = known.pob;
    rec.placeOfIssue = known.placeOfIssue;
    rec.entriesCount = known.entriesCount || '';
    rec.stayDuration = known.stayDuration || '';
    if (known.doiIso) {
      rec.doiIso = known.doiIso;
      rec.doiDmy = known.doiDmy;
    }
    if (known.doeIso) {
      rec.doeIso = known.doeIso;
      rec.doeDmy = known.doeDmy;
    }
    if (known.docNumber) rec.docNumber = known.docNumber;
    if (known.phone) rec.phone = known.phone;
    if (known.email) rec.email = known.email;
  }
  return rec;
}

// ─── FIELD RESOLVER ACCORDING TO DATE FORMAT ─────────────────────────────────
function getFieldValue(rec, key) {
  if (!rec) return '';
  const isDmy = state.dateFormat === 'DMY';

  switch (key) {
    case 'dobFormatted':
      return isDmy ? (rec.dobDmy || rec.dobIso) : (rec.dobIso || rec.dobDmy);
    case 'doeFormatted':
      return isDmy ? (rec.doeDmy || rec.doeIso) : (rec.doeIso || rec.doeDmy);
    case 'doiFormatted':
      return isDmy ? (rec.doiDmy || rec.doiIso) : (rec.doiIso || rec.doiDmy);
    case 'docNumber':
      return rec.docNumber || (document.getElementById('ej_docNumber') ? document.getElementById('ej_docNumber').value : '') || (document.getElementById('req_visaNumber') ? document.getElementById('req_visaNumber').value : '7011172155');
    case 'closestMission':
      return rec.closestMission || rec.arrivalPort || 'الاسكندرية';
    case 'saudiAddress':
      return rec.saudiAddress || (document.getElementById('req_address') ? document.getElementById('req_address').value : 'جده');
    case 'nationalId':
      return rec.nationalId || rec.personalNumber || '';
    case 'phone':
      return rec.phone || (document.getElementById('req_phone') ? document.getElementById('req_phone').value : '0582625697');
    case 'email':
      return rec.email || (document.getElementById('req_email') ? document.getElementById('req_email').value : 'sayedabdo8888@gmail.com') || 'sayedabdo8888@gmail.com';
    case 'carrier':
      return rec.carrier || 'جوا';
    case 'arrivalPort':
      return rec.arrivalPort || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
    case 'expectedArrivalDate':
      return rec.expectedArrivalDate || '2026/09/30';
    case 'visitPurpose':
      return rec.visitPurpose || ('زيارة عائلية لـ ' + (document.getElementById('req_name') ? document.getElementById('req_name').value : 'السيد عبدالمنعم السيد بصار'));
    case 'relation':
      if (rec.relation === 'ابنة' || rec.relation === 'بنت') return 'بنت';
      if (rec.relation === 'زوجة' || rec.relation === 'زوجه') return 'زوجة';
      return rec.relation || 'زوجة';
    case 'employmentStatus':
      if (rec.relation === 'زوجة' || rec.relation === 'بنت' || rec.relation === 'ابنة' || rec.isUnemployed) return 'لا يعمل';
      return rec.employmentStatus || 'لا يعمل';
    default:
      return rec[key] !== undefined ? String(rec[key]) : '';
  }
}

// ─── TAB SWITCHER (تأشير vs إنجاز) ──────────────────────────────────────────
function switchTab(tabName) {
  state.activeTab = tabName;
  state.activePlatform = tabName;

  const tabBtnTasheer = document.getElementById('tabBtnTasheer');
  const tabBtnEnjaz = document.getElementById('tabBtnEnjaz');
  const tabContentTasheer = document.getElementById('tabContentTasheer');
  const tabContentEnjaz = document.getElementById('tabContentEnjaz');

  if (tabName === 'enjaz') {
    if (tabBtnEnjaz) {
      tabBtnEnjaz.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md bg-[#2E314D] text-white border border-[#202237]';
    }
    if (tabBtnTasheer) {
      tabBtnTasheer.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all text-slate-600 hover:text-slate-900';
    }
    if (tabContentTasheer) tabContentTasheer.classList.add('hidden');
    if (tabContentEnjaz) tabContentEnjaz.classList.remove('hidden');
    showToast('تم الانتقال إلى منصة إنجاز (تأشيرة دخول من الممثليات) 🇸🇦', 'info');
  } else {
    if (tabBtnTasheer) {
      tabBtnTasheer.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md bg-white text-slate-900 border border-slate-200';
    }
    if (tabBtnEnjaz) {
      tabBtnEnjaz.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all text-slate-600 hover:text-slate-900';
    }
    if (tabContentEnjaz) tabContentEnjaz.classList.add('hidden');
    if (tabContentTasheer) tabContentTasheer.classList.remove('hidden');
    showToast('تم الانتقال إلى منصة تأشير (تساهيل - طلب زيارة عائلية) 🛂', 'info');
  }

  state.sequentialIndex = 0;
  populateUIFromRecord();
  updateSequentialUI();
  playHapticBeep(850, 'sine', 0.04);
}

// ─── SEQUENTIAL AUTO-COPY FLOW ───────────────────────────────────────────────
function getActiveSequence() {
  if (state.activeTab === 'enjaz') return ENJAZ_SEQUENCE;
  if (state.activePlatform === 'tasheer') return TASHEER_SEQUENCE;
  return FAMILY_VISIT_SEQUENCE;
}

function startSequentialCopy() {
  state.sequentialActive = true;
  state.sequentialIndex = 0;
  copyCurrentSequentialStep();
  updateSequentialUI();
}

function nextSequentialStep() {
  const seq = getActiveSequence();
  if (state.sequentialIndex < seq.length - 1) {
    state.sequentialIndex++;
    copyCurrentSequentialStep();
  } else {
    playHapticBeep(1100, 'triangle', 0.12);
    showToast('اكتمل نسخ جميع حقول الشخص المطلوب للزيارة بنجاح! 🚀', 'success');
    state.sequentialIndex = 0;
  }
  updateSequentialUI();
}

function prevSequentialStep() {
  if (state.sequentialIndex > 0) {
    state.sequentialIndex--;
    copyCurrentSequentialStep();
    updateSequentialUI();
  }
}

function copyCurrentSequentialStep() {
  if (!state.currentRecord) return;
  const seq = getActiveSequence();
  const step = seq[state.sequentialIndex];
  if (!step) return;

  const val = getFieldValue(state.currentRecord, step.key);
  copyToClipboard(val, `${step.label} (${state.sequentialIndex + 1}/${seq.length})`);
}

function updateSequentialUI() {
  const container = document.getElementById('seqDockContainer');
  if (!container) return;

  const seq = getActiveSequence();
  const step = seq[state.sequentialIndex];
  if (!step) return;

  const currentVal = state.currentRecord ? getFieldValue(state.currentRecord, step.key) : '';

  const labelEl = document.getElementById('seqStepLabel');
  const valEl = document.getElementById('seqStepValue');
  const countEl = document.getElementById('seqStepCounter');
  const progressEl = document.getElementById('seqProgressBar');

  if (labelEl) labelEl.textContent = step.label;
  if (valEl) valEl.textContent = currentVal || '(فارغ)';
  if (countEl) countEl.textContent = `${state.sequentialIndex + 1} من ${seq.length}`;
  if (progressEl) {
    const percent = Math.round(((state.sequentialIndex + 1) / seq.length) * 100);
    progressEl.style.width = `${percent}%`;
  }
}

// ─── MULTI-PERSON FAMILY VISIT QUEUE ─────────────────────────────────────────
function addCurrentToFamilyQueue() {
  updateRecordFromUI();
  if (!state.currentRecord || !state.currentRecord.passportNumber) {
    showToast('يرجى تفريغ أو إدخال بيانات الشخص أولاً', 'error');
    return;
  }

  // Check if exists
  const existingIdx = state.familyMembers.findIndex(m => m.passportNumber === state.currentRecord.passportNumber);
  if (existingIdx >= 0) {
    state.familyMembers[existingIdx] = { ...state.currentRecord };
    showToast(`تم تحديث بيانات: ${state.currentRecord.fullNameAr || state.currentRecord.passportNumber}`, 'success');
  } else {
    state.familyMembers.push({ ...state.currentRecord });
    showToast(`تمت إضافة: ${state.currentRecord.fullNameAr || state.currentRecord.passportNumber} إلى قائمة الزيارة ✓`, 'success');
  }

  renderFamilyMembersTable();
  renderEnjazFamilySwitcher();
  saveRecordToVault(state.currentRecord);
}

function selectFamilyMember(id) {
  const member = state.familyMembers.find(m => m.id === id);
  if (!member) return;
  state.currentRecord = { ...member };
  populateUIFromRecord();
  renderFamilyMembersTable();
  renderEnjazFamilySwitcher();
  playHapticBeep(850, 'sine', 0.04);
  showToast(`تم تفعيل: ${member.fullNameAr || member.passportNumber}`, 'info');
}

function nextFamilyMember() {
  if (!state.familyMembers || !state.familyMembers.length) return;
  const currentId = state.currentRecord ? state.currentRecord.id : null;
  const currentIdx = state.familyMembers.findIndex(m => m.id === currentId);
  const nextIdx = (currentIdx + 1) % state.familyMembers.length;
  selectFamilyMember(state.familyMembers[nextIdx].id);
}

function prevFamilyMember() {
  if (!state.familyMembers || !state.familyMembers.length) return;
  const currentId = state.currentRecord ? state.currentRecord.id : null;
  const currentIdx = state.familyMembers.findIndex(m => m.id === currentId);
  const prevIdx = (currentIdx - 1 + state.familyMembers.length) % state.familyMembers.length;
  selectFamilyMember(state.familyMembers[prevIdx].id);
}

function renderEnjazFamilySwitcher() {
  const grid = document.getElementById('ej_familyGrid');
  const countBadge = document.getElementById('ej_memberCounterBadge');
  const activeNameDisp = document.getElementById('ej_activePersonNameDisplay');

  if (!state.familyMembers || state.familyMembers.length === 0) {
    if (grid) grid.innerHTML = '<div class="col-span-full py-4 text-center text-xs text-slate-400 font-bold bg-white rounded-xl border border-dashed border-slate-300">لا يوجد مطلوبين مضافين حالياً.</div>';
    if (countBadge) countBadge.textContent = '0 من 0';
    return;
  }

  const currentId = state.currentRecord ? state.currentRecord.id : state.familyMembers[0].id;
  const currentIdx = state.familyMembers.findIndex(m => m.id === currentId);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  if (countBadge) {
    countBadge.textContent = `${activeIdx + 1} من ${state.familyMembers.length}`;
  }
  if (activeNameDisp && state.currentRecord) {
    activeNameDisp.textContent = state.currentRecord.fullNameAr || state.currentRecord.passportNumber;
  }

  if (!grid) return;

  grid.innerHTML = state.familyMembers.map((m, idx) => {
    const isSelected = m.id === currentId;
    const isWife = m.relation === 'زوجة' || m.relation === 'زوجه';
    const isDaughter = m.relation === 'بنت' || m.relation === 'ابنة';
    const icon = isWife ? '👩' : (isDaughter ? '👧' : (m.sex === 'ذكر' ? '👦' : '👤'));
    const relationLabel = isWife ? 'زوجة' : (isDaughter ? 'بنت' : (m.relation || 'مطلوب للزيارة'));
    const relationBadgeColor = isWife 
      ? 'bg-purple-100 text-purple-900 border-purple-200' 
      : 'bg-rose-100 text-rose-900 border-rose-200';

    return `
      <div
        onclick="selectFamilyMember('${m.id}')"
        class="cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col justify-between gap-2 text-right relative overflow-hidden select-none active:scale-98 ${
          isSelected
            ? 'bg-[#2E314D] border-[#202237] text-white shadow-lg ring-2 ring-purple-400 transform -translate-y-0.5'
            : 'bg-white hover:bg-purple-50/60 border-slate-200 text-slate-800 shadow-2xs hover:border-purple-300'
        }"
      >
        <!-- Top row: Avatar + First Name + Active status -->
        <div class="flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl shrink-0 p-1 rounded-lg ${isSelected ? 'bg-white/15' : 'bg-slate-100'}">${icon}</span>
            <div class="min-w-0">
              <span class="text-xs font-black truncate block ${isSelected ? 'text-white' : 'text-slate-900'}">
                ${m.firstNameAr || m.fullNameAr}
              </span>
              <span class="text-[10px] truncate block ${isSelected ? 'text-purple-200 font-medium' : 'text-slate-400'}">
                ${m.fullNameAr || ''}
              </span>
            </div>
          </div>
          ${
            isSelected
              ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shrink-0 flex items-center gap-1 shadow-xs">✓ محدد</span>'
              : `<span class="text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">#${idx + 1}</span>`
          }
        </div>

        <!-- Middle row: Relation + Passport -->
        <div class="flex items-center justify-between text-[11px] gap-1 pt-0.5">
          <span class="px-2 py-0.5 rounded-md font-bold text-[10px] border ${
            isSelected
              ? 'bg-purple-800/90 text-purple-100 border-purple-600'
              : relationBadgeColor
          }">
            ${relationLabel}
          </span>
          <span class="font-mono text-[11px] font-black ${isSelected ? 'text-emerald-300' : 'text-slate-700'}">
            ${m.passportNumber}
          </span>
        </div>

        <!-- Passport Start & End Dates (تاريخ بداية وانتهاء الجواز) -->
        <div class="flex items-center justify-between text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-white/10 text-emerald-200 border border-white/10' : 'bg-slate-50 text-slate-700 border border-slate-200/60'}">
          <span title="تاريخ إصدار الجواز (البداية)">📅 ${m.doiIso || m.doiDmy}</span>
          <span class="text-[9px] opacity-70">إلى</span>
          <span title="تاريخ انتهاء الجواز (النهاية)">${m.doeIso || m.doeDmy}</span>
        </div>

        <!-- Bottom row: Profession + Unemployed status -->
        <div class="flex items-center justify-between pt-1 border-t ${isSelected ? 'border-purple-700/50' : 'border-slate-100'} text-[10px]">
          <span class="${isSelected ? 'text-purple-200' : 'text-slate-600'} font-medium truncate">
            ${m.profession || (isWife ? 'ربة منزل' : 'طفله')}
          </span>
          <span class="font-black shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-700'} bg-emerald-500/10 px-1.5 py-0.2 rounded">
            لا يعمل ✓
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function removeFamilyMember(id) {
  state.familyMembers = state.familyMembers.filter(m => m.id !== id);
  renderFamilyMembersTable();
  renderEnjazFamilySwitcher();
  showToast('تم الحذف من قائمة المطلوبين للزيارة', 'info');
}

function renderFamilyMembersTable() {
  const tbody = document.getElementById('familyTableBody');
  const countEl = document.getElementById('familyCountBadge');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${state.familyMembers.length} شخص`;

  if (!state.familyMembers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="text-center py-6 text-slate-400 text-xs font-medium">
          لا يوجد أشخاص مضافين حالياً. قم بتفريغ الجواز واضغط "إضافة لقائمة المطلوبين للزيارة".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.familyMembers.map((m, idx) => {
    const isSelected = state.currentRecord && state.currentRecord.id === m.id;
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs ${isSelected ? 'bg-emerald-50/60 font-bold' : ''}">
        <td class="py-2.5 px-3 font-mono font-black text-slate-800">${m.passportNumber}</td>
        <td class="py-2.5 px-3 text-slate-900">${m.fullNameAr || m.fullNameEn}</td>
        <td class="py-2.5 px-3 text-slate-600">${m.nationalityAr}</td>
        <td class="py-2.5 px-3 text-slate-600">${m.religion}</td>
        <td class="py-2.5 px-3 text-purple-700 font-bold">${m.relation}</td>
        <td class="py-2.5 px-3 font-mono text-slate-500">${m.dobIso || m.dobDmy}</td>
        <td class="py-2.5 px-3 text-emerald-800 font-bold">${m.profession}</td>
        <td class="py-2.5 px-3 text-purple-700 font-bold">${m.visitPurpose || 'زيارة عائلية'}</td>
        <td class="py-2.5 px-3 text-sky-800 font-bold">${m.arrivalPort}</td>
        <td class="py-2.5 px-3 text-slate-600">${m.sex}</td>
        <td class="py-2.5 px-3 text-slate-700 font-bold">${m.entriesCount ? m.entriesCount : '<span class="text-slate-400 font-normal">-</span>'}</td>
        <td class="py-2.5 px-3 font-mono text-slate-700">${m.stayDuration ? `${m.stayDuration} يوم` : '<span class="text-slate-400 font-normal">-</span>'}</td>
        <td class="py-2.5 px-3 text-left space-x-1">
          <button onclick="selectFamilyMember('${m.id}')" class="px-2.5 py-1 rounded-lg ${isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'} font-bold text-[11px] transition">
            ${isSelected ? 'المحدد الآن ✓' : 'تحديد للنسخ'}
          </button>
          <button onclick="removeFamilyMember('${m.id}')" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px] transition">
            حذف
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── INDEXEDDB LOCAL VAULT ───────────────────────────────────────────────────
const DB_NAME = 'PassportVisaAssistantVault';
const DB_VERSION = 1;
const STORE_NAME = 'passports';

function openVaultDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('passportNumber', 'passportNumber', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRecordToVault(rec) {
  if (!rec || !rec.passportNumber) return;
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(rec);
    await new Promise(r => tx.oncomplete = r);
    loadVaultRecords();
  } catch (err) {
    console.error('Save vault error:', err);
  }
}

async function loadVaultRecords() {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      state.vaultRecords = (req.result || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      renderVaultTable();
    };
  } catch (err) {
    console.error('Load vault error:', err);
  }
}

async function deleteVaultRecord(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الجواز من السجل المحلي؟')) return;
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise(r => tx.oncomplete = r);
    showToast('تم الحذف من السجل', 'info');
    loadVaultRecords();
  } catch (err) {
    console.error('Delete vault error:', err);
  }
}

function renderVaultTable(filter = '') {
  const tbody = document.getElementById('vaultTableBody');
  const countEl = document.getElementById('vaultCountBadge');
  if (!tbody) return;

  const q = filter.trim().toLowerCase();
  const records = state.vaultRecords.filter(r => {
    if (!q) return true;
    return (r.passportNumber || '').toLowerCase().includes(q) ||
           (r.fullNameEn || '').toLowerCase().includes(q) ||
           (r.fullNameAr || '').includes(q) ||
           (r.nationalityAr || '').includes(q);
  });

  if (countEl) countEl.textContent = `${records.length} جواز`;

  if (!records.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6 text-slate-400 text-xs font-medium">
          لا توجد جوازات مسجلة حالياً في السجل المحلي.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
      <td class="py-2.5 px-3 font-mono font-black text-slate-800">${r.passportNumber}</td>
      <td class="py-2.5 px-3 font-bold text-slate-900">${r.fullNameAr || r.fullNameEn}</td>
      <td class="py-2.5 px-3 text-slate-500">${r.nationalityAr} (${r.relation || 'غير محدد'})</td>
      <td class="py-2.5 px-3 text-slate-500 font-mono">${r.doeIso || r.doeDmy}</td>
      <td class="py-2.5 px-3 text-sky-700 font-bold">${r.arrivalPort || '-'}</td>
      <td class="py-2.5 px-3 text-slate-400 text-[11px]">${new Date(r.timestamp).toLocaleDateString('ar-SA')}</td>
      <td class="py-2.5 px-3 text-left space-x-1">
        <button onclick="loadRecordFromVault('${r.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition">
          فتح وتفريغ
        </button>
        <button onclick="deleteVaultRecord('${r.id}')" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px] transition">
          حذف
        </button>
      </td>
    </tr>
  `).join('');
}

function loadRecordFromVault(id) {
  const rec = state.vaultRecords.find(r => r.id === id);
  if (!rec) return;
  state.currentRecord = { ...rec };
  populateUIFromRecord();
  showToast(`تم تحميل بيانات جواز: ${rec.passportNumber}`, 'info');
  window.scrollTo({ top: document.getElementById('fieldsSection').offsetTop - 60, behavior: 'smooth' });
}

// ─── UI POPULATION ────────────────────────────────────────────────────────────
function populateUIFromRecord() {
  const rec = state.currentRecord;
  if (!rec) return;

  const isDmy = state.dateFormat === 'DMY';
  const dobVal = isDmy ? (rec.dobDmy || rec.dobIso || '') : (rec.dobIso || rec.dobDmy || '');
  const doiVal = isDmy ? (rec.doiDmy || rec.doiIso || '') : (rec.doiIso || rec.doiDmy || '');
  const doeVal = isDmy ? (rec.doeDmy || rec.doeIso || '') : (rec.doeIso || rec.doeDmy || '');
  const docNum = rec.docNumber || getElVal('ej_docNumber') || getElVal('req_visaNumber') || '7011172155';
  const requesterName = getElVal('req_name') || 'السيد عبدالمنعم السيد بصار';
  const visitPurpose = rec.visitPurpose || ('زيارة عائلية لـ ' + requesterName);
  const carrierVal = rec.carrier || 'جوا';
  const arrivalPortVal = rec.arrivalPort || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
  const expectedDateVal = rec.expectedArrivalDate || '2026/09/30';
  const saudiAddr = rec.saudiAddress || getElVal('req_address') || 'جده';
  const reqPhone = rec.phone || getElVal('req_phone') || '0582625697';
  const globalEmail = rec.email || 'sayedabdo8888@gmail.com';
  rec.email = globalEmail;
  rec.docNumber = docNum;
  rec.visitPurpose = visitPurpose;
  rec.carrier = carrierVal;
  rec.arrivalPort = arrivalPortVal;
  rec.expectedArrivalDate = expectedDateVal;

  // تطبيع صلة القرابة والحالة المهنية: الزوجة والأبناء لا يعملن وصلة القرابة زوجة / بنت
  if (rec.relation === 'ابنة' || rec.relation === 'بنت') {
    rec.relation = 'بنت';
    rec.isUnemployed = true;
    rec.employmentStatus = 'لا يعمل';
    if (!rec.profession || rec.profession === 'لا يعمل') rec.profession = 'طفله';
  } else if (rec.relation === 'زوجة' || rec.relation === 'زوجه') {
    rec.relation = 'زوجة';
    rec.isUnemployed = true;
    rec.employmentStatus = 'لا يعمل';
    if (!rec.profession || rec.profession === 'بكالوريوس علوم') rec.profession = 'ربة منزل';
  }

  // 1. Tasheer Form Fields (حقول منصة تأشير)
  setVal('f_nationalityAr', rec.nationalityAr);
  setVal('f_firstNameAr', rec.firstNameAr);
  setVal('f_fatherNameAr', rec.fatherNameAr);
  setVal('f_grandFatherNameAr', rec.grandFatherNameAr);
  setVal('f_familyNameAr', rec.familyNameAr);

  setVal('f_firstNameEn', rec.firstNameEn);
  setVal('f_fatherNameEn', rec.fatherNameEn);
  setVal('f_grandFatherNameEn', rec.grandFatherNameEn);
  setVal('f_familyNameEn', rec.familyNameEn);
  setVal('f_fullNameEn', rec.fullNameEn || [rec.firstNameEn, rec.fatherNameEn, rec.grandFatherNameEn, rec.familyNameEn].filter(Boolean).join(' '));

  setVal('f_dob', dobVal);
  setVal('f_pob', rec.pob);
  setVal('f_religion', rec.religion || 'مسلم');
  setVal('f_profession', rec.profession || '');
  setVal('f_sex', rec.sex || 'أنثى');
  setVal('f_relation', rec.relation || 'زوجة');
  setVal('f_phone', reqPhone);
  setVal('f_email', globalEmail);

  setVal('f_passportNumber', rec.passportNumber);
  setVal('f_docType', rec.docType || 'عادي');
  setVal('f_doi', doiVal);
  setVal('f_doe', doeVal);
  setVal('f_placeOfIssue', rec.placeOfIssue || rec.nationalityAr);

  setVal('f_arrivalPort', arrivalPortVal);
  setVal('f_visitPurpose', visitPurpose);
  setVal('f_entriesCount', rec.entriesCount || '');
  setVal('f_stayDuration', rec.stayDuration || '');

  // 2. Enjaz Form Fields (حقول منصة إنجاز الرسمية - مطابقة 100% للسكرين شوت)
  // كارت 1: بيانات التأشيرة
  setVal('ej_visaType', rec.visaType || 'زيارة عائلية');
  setVal('ej_currentNationality', rec.nationalityAr || 'مصر');
  setVal('ej_residenceCountry', rec.residenceCountry || rec.nationalityAr || 'مصر');
  setVal('ej_closestMission', rec.closestMission || 'الاسكندرية');
  setVal('ej_docNumber', docNum);

  // كارت 2: الأسماء الرباعية
  setVal('ej_firstNameAr', rec.firstNameAr);
  setVal('ej_fatherNameAr', rec.fatherNameAr);
  setVal('ej_grandFatherNameAr', rec.grandFatherNameAr);
  setVal('ej_familyNameAr', rec.familyNameAr);

  setVal('ej_firstNameEn', rec.firstNameEn);
  setVal('ej_fatherNameEn', rec.fatherNameEn);
  setVal('ej_grandFatherNameEn', rec.grandFatherNameEn);
  setVal('ej_familyNameEn', rec.familyNameEn);

  // كارت 3: بيانات الجواز والهوية والمهنة والعنوان
  setVal('ej_passportNumber', rec.passportNumber);
  setVal('ej_docType', rec.docType || 'عادي');
  setVal('ej_countryOfIssue', rec.placeOfIssue || rec.nationalityAr || 'مصر');
  setVal('ej_doi', doiVal);
  setVal('ej_doe', doeVal);
  setVal('ej_pob', rec.pob || rec.placeOfIssue || 'مصر');
  setVal('ej_dob', dobVal);
  setVal('ej_nationalId', rec.nationalId || rec.personalNumber || '');
  setVal('ej_religion', rec.religion || 'مسلم');
  setVal('ej_maritalStatus', rec.maritalStatus || (rec.relation === 'زوجة' ? 'متزوج' : (rec.relation === 'بنت' || rec.relation === 'ابن' || rec.relation === 'ابنة' ? 'أعزب' : 'متزوج')));
  setVal('ej_sex', rec.sex || 'أنثى');
  setVal('ej_employmentStatus', rec.employmentStatus || 'لا يعمل');
  setVal('ej_profession', rec.profession || (rec.relation === 'زوجة' ? 'ربة منزل' : 'طفله'));
  setVal('ej_saudiAddress', saudiAddr);
  setVal('ej_relation', rec.relation || 'زوجة');
  setVal('ej_phoneCountryCode', rec.phoneCountryCode || '+966');
  setVal('ej_phone', reqPhone);
  setVal('ej_email', globalEmail);
  setVal('req_email', globalEmail);

  // كارت 4: بيانات النقل والوصول
  setVal('ej_carrier', carrierVal);
  setVal('ej_arrivalPort', arrivalPortVal);
  setVal('ej_expectedArrivalDate', expectedDateVal);
  setVal('ej_visitPurpose', visitPurpose);
  setVal('ej_flightNumber', rec.flightNumber || '');

  // Checkbox لا يعمل في إنجاز
  const unempCheck = document.getElementById('ej_unemployedCheck');
  if (unempCheck) {
    unempCheck.checked = Boolean(rec.isUnemployed || rec.employmentStatus === 'لا يعمل' || rec.relation === 'زوجة' || rec.relation === 'بنت' || rec.profession === 'ربة منزل' || rec.profession === 'بدون عمل' || rec.profession === 'طفله');
  }

  // Radio الجنسية السابقة
  const rPrevYes = document.getElementById('ej_prevNatYes');
  const rPrevNo = document.getElementById('ej_prevNatNo');
  if (rPrevYes && rPrevNo) {
    if (rec.hasPreviousNationality === 'نعم') {
      rPrevYes.checked = true;
      togglePrevNatField(true);
    } else {
      rPrevNo.checked = true;
      togglePrevNatField(false);
    }
  }

  // صورة إنجاز الشخصية
  const ejPhotoImg = document.getElementById('ej_photoImg');
  const ejPhotoPlaceholder = document.getElementById('ej_photoPlaceholder');
  if (ejPhotoImg && ejPhotoPlaceholder) {
    if (rec.photoDataUrl) {
      ejPhotoImg.src = rec.photoDataUrl;
      ejPhotoImg.classList.remove('hidden');
      ejPhotoPlaceholder.classList.add('hidden');
    } else {
      ejPhotoImg.src = '';
      ejPhotoImg.classList.add('hidden');
      ejPhotoPlaceholder.classList.remove('hidden');
    }
  }

  // تحديث شريط اسم الشخص المختار
  const dispName = rec.fullNameAr || rec.passportNumber || '(لم يتم تحديد شخص)';
  const b1 = document.getElementById('activePersonNameDisplay');
  const b2 = document.getElementById('ej_activePersonNameDisplay');
  if (b1) b1.textContent = dispName;
  if (b2) b2.textContent = dispName;

  // Update Sequential helper
  updateSequentialUI();

  // تحديث كروت التنقل السريع في إنجاز
  renderEnjazFamilySwitcher();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? String(val) : '';
}

function updateRecordFromUI() {
  if (!state.currentRecord) state.currentRecord = createEmptyRecord();
  const rec = state.currentRecord;

  if (state.activeTab === 'enjaz') {
    // قراءة البيانات من تاب إنجاز
    rec.visaType = getElVal('ej_visaType') || 'زيارة عائلية';
    rec.nationalityAr = getElVal('ej_currentNationality') || 'مصر';
    rec.residenceCountry = getElVal('ej_residenceCountry') || 'مصر';
    rec.closestMission = getElVal('ej_closestMission') || 'الاسكندرية';
    rec.docNumber = getElVal('ej_docNumber') || getElVal('req_visaNumber') || '7011172155';

    rec.firstNameAr = getElVal('ej_firstNameAr');
    rec.fatherNameAr = getElVal('ej_fatherNameAr');
    rec.grandFatherNameAr = getElVal('ej_grandFatherNameAr');
    rec.familyNameAr = getElVal('ej_familyNameAr');
    rec.fullNameAr = [rec.firstNameAr, rec.fatherNameAr, rec.grandFatherNameAr, rec.familyNameAr].filter(Boolean).join(' ');

    rec.firstNameEn = getElVal('ej_firstNameEn');
    rec.fatherNameEn = getElVal('ej_fatherNameEn');
    rec.grandFatherNameEn = getElVal('ej_grandFatherNameEn');
    rec.familyNameEn = getElVal('ej_familyNameEn');
    rec.fullNameEn = [rec.firstNameEn, rec.fatherNameEn, rec.grandFatherNameEn, rec.familyNameEn].filter(Boolean).join(' ');

    rec.passportNumber = getElVal('ej_passportNumber');
    rec.docType = getElVal('ej_docType') || 'عادي';
    rec.placeOfIssue = getElVal('ej_countryOfIssue') || 'مصر';
    
    const ejDoi = getElVal('ej_doi');
    const ejDoe = getElVal('ej_doe');
    if (ejDoi) {
      rec.doiIso = ejDoi;
      if (ejDoi.includes('/')) {
        const parts = ejDoi.split('/');
        if (parts[0].length === 4) {
          rec.doiIso = ejDoi;
          rec.doiDmy = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          rec.doiDmy = ejDoi;
          rec.doiIso = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }
    if (ejDoe) {
      rec.doeIso = ejDoe;
      if (ejDoe.includes('/')) {
        const parts = ejDoe.split('/');
        if (parts[0].length === 4) {
          rec.doeIso = ejDoe;
          rec.doeDmy = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          rec.doeDmy = ejDoe;
          rec.doeIso = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }

    rec.pob = getElVal('ej_pob') || 'مصر';
    rec.dobIso = getElVal('ej_dob');
    rec.nationalId = getElVal('ej_nationalId');
    rec.religion = getElVal('ej_religion') || 'مسلم';
    rec.maritalStatus = getElVal('ej_maritalStatus') || 'متزوج';
    rec.sex = getElVal('ej_sex') || 'أنثى';
    rec.employmentStatus = getElVal('ej_employmentStatus') || 'لا يعمل';
    rec.profession = getElVal('ej_profession') || 'ربة منزل';
    rec.saudiAddress = getElVal('ej_saudiAddress') || getElVal('req_address') || 'جده';
    rec.relation = getElVal('ej_relation') || 'زوجة';
    rec.phoneCountryCode = getElVal('ej_phoneCountryCode') || '+966';
    rec.phone = getElVal('ej_phone') || getElVal('req_phone') || '';

    rec.carrier = getElVal('ej_carrier') || 'جوا';
    rec.arrivalPort = getElVal('ej_arrivalPort') || 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم';
    rec.expectedArrivalDate = getElVal('ej_expectedArrivalDate') || '2026/09/30';
    rec.visitPurpose = getElVal('ej_visitPurpose') || ('زيارة عائلية لـ ' + (getElVal('req_name') || 'السيد عبدالمنعم السيد بصار'));
    rec.email = getElVal('ej_email') || getElVal('req_email') || 'sayedabdo8888@gmail.com';

    // مزامنة فورية لحقول تاب تأشير
    const isDmy = state.dateFormat === 'DMY';
    setVal('f_nationalityAr', rec.nationalityAr);
    setVal('f_firstNameAr', rec.firstNameAr);
    setVal('f_fatherNameAr', rec.fatherNameAr);
    setVal('f_grandFatherNameAr', rec.grandFatherNameAr);
    setVal('f_familyNameAr', rec.familyNameAr);
    setVal('f_firstNameEn', rec.firstNameEn);
    setVal('f_fatherNameEn', rec.fatherNameEn);
    setVal('f_grandFatherNameEn', rec.grandFatherNameEn);
    setVal('f_familyNameEn', rec.familyNameEn);
    setVal('f_dob', isDmy ? (rec.dobDmy || rec.dobIso) : (rec.dobIso || rec.dobDmy));
    setVal('f_pob', rec.pob);
    setVal('f_religion', rec.religion);
    setVal('f_profession', rec.profession);
    setVal('f_sex', rec.sex);
    setVal('f_relation', rec.relation);
    setVal('f_employmentStatus', rec.employmentStatus);
    setVal('f_phone', rec.phone);
    setVal('f_email', rec.email);
    setVal('req_email', rec.email);
    setVal('f_passportNumber', rec.passportNumber);
    setVal('f_docType', rec.docType);
    setVal('f_doi', isDmy ? (rec.doiDmy || rec.doiIso) : (rec.doiIso || rec.doiDmy));
    setVal('f_doe', isDmy ? (rec.doeDmy || rec.doeIso) : (rec.doeIso || rec.doeDmy));
    setVal('f_placeOfIssue', rec.placeOfIssue);
    setVal('f_arrivalPort', rec.arrivalPort);
    setVal('f_visitPurpose', rec.visitPurpose);
  } else {
    // قراءة البيانات من تاب تأشير
    rec.nationalityAr = getElVal('f_nationalityAr');
    rec.firstNameAr = getElVal('f_firstNameAr');
    rec.fatherNameAr = getElVal('f_fatherNameAr');
    rec.grandFatherNameAr = getElVal('f_grandFatherNameAr');
    rec.familyNameAr = getElVal('f_familyNameAr');
    rec.fullNameAr = [rec.firstNameAr, rec.fatherNameAr, rec.grandFatherNameAr, rec.familyNameAr].filter(Boolean).join(' ');

    rec.firstNameEn = getElVal('f_firstNameEn');
    rec.fatherNameEn = getElVal('f_fatherNameEn');
    rec.grandFatherNameEn = getElVal('f_grandFatherNameEn');
    rec.familyNameEn = getElVal('f_familyNameEn');
    rec.fullNameEn = [rec.firstNameEn, rec.fatherNameEn, rec.grandFatherNameEn, rec.familyNameEn].filter(Boolean).join(' ');

    rec.dobIso = getElVal('f_dob');
    rec.pob = getElVal('f_pob');
    rec.religion = getElVal('f_religion');
    rec.profession = getElVal('f_profession');
    rec.sex = getElVal('f_sex');
    rec.relation = getElVal('f_relation');
    rec.phone = getElVal('f_phone');
    rec.email = getElVal('f_email') || 'sayedabdo8888@gmail.com';

    rec.passportNumber = getElVal('f_passportNumber');
    rec.docType = getElVal('f_docType');

    const fDoi = getElVal('f_doi');
    const fDoe = getElVal('f_doe');
    if (fDoi) {
      rec.doiIso = fDoi;
      if (fDoi.includes('/')) {
        const parts = fDoi.split('/');
        if (parts[0].length === 4) {
          rec.doiIso = fDoi;
          rec.doiDmy = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          rec.doiDmy = fDoi;
          rec.doiIso = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }
    if (fDoe) {
      rec.doeIso = fDoe;
      if (fDoe.includes('/')) {
        const parts = fDoe.split('/');
        if (parts[0].length === 4) {
          rec.doeIso = fDoe;
          rec.doeDmy = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          rec.doeDmy = fDoe;
          rec.doeIso = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }
    rec.placeOfIssue = getElVal('f_placeOfIssue');

    rec.arrivalPort = getElVal('f_arrivalPort');
    rec.visitPurpose = getElVal('f_visitPurpose') || ('زيارة عائلية لـ ' + (getElVal('req_name') || 'السيد عبدالمنعم السيد بصار'));
    rec.entriesCount = getElVal('f_entriesCount');
    rec.stayDuration = getElVal('f_stayDuration');

    // مزامنة فورية لحقول تاب إنجاز
    const isDmy = state.dateFormat === 'DMY';
    setVal('ej_currentNationality', rec.nationalityAr);
    setVal('ej_firstNameAr', rec.firstNameAr);
    setVal('ej_fatherNameAr', rec.fatherNameAr);
    setVal('ej_grandFatherNameAr', rec.grandFatherNameAr);
    setVal('ej_familyNameAr', rec.familyNameAr);
    setVal('ej_firstNameEn', rec.firstNameEn);
    setVal('ej_fatherNameEn', rec.fatherNameEn);
    setVal('ej_grandFatherNameEn', rec.grandFatherNameEn);
    setVal('ej_familyNameEn', rec.familyNameEn);
    setVal('ej_passportNumber', rec.passportNumber);
    setVal('ej_docType', rec.docType);
    setVal('ej_countryOfIssue', rec.placeOfIssue);
    setVal('ej_doi', isDmy ? (rec.doiDmy || rec.doiIso) : (rec.doiIso || rec.doiDmy));
    setVal('ej_doe', isDmy ? (rec.doeDmy || rec.doeIso) : (rec.doeIso || rec.doeDmy));
    setVal('ej_pob', rec.pob);
    setVal('ej_dob', isDmy ? (rec.dobDmy || rec.dobIso) : (rec.dobIso || rec.dobDmy));
    setVal('ej_religion', rec.religion);
    setVal('ej_sex', rec.sex);
    setVal('ej_profession', rec.profession);
    setVal('ej_relation', rec.relation);
    setVal('ej_employmentStatus', rec.employmentStatus);
    setVal('ej_phone', rec.phone);
    setVal('ej_email', rec.email);
    setVal('req_email', rec.email);
    setVal('ej_arrivalPort', rec.arrivalPort);
    setVal('ej_visitPurpose', rec.visitPurpose);
  }
}

// ─── ENJAZ SPECIAL ACTION HELPERS ────────────────────────────────────────────
function copyEnjazFullSummary() {
  if (!state.currentRecord) {
    showToast('يرجى تفريغ أو اختيار بيانات شخص أولاً', 'error');
    return;
  }
  const r = state.currentRecord;
  const isDmy = state.dateFormat === 'DMY';
  const dob = isDmy ? (r.dobDmy || r.dobIso) : (r.dobIso || r.dobDmy);
  const doi = isDmy ? (r.doiDmy || r.doiIso) : (r.doiIso || r.doiDmy);
  const doe = isDmy ? (r.doeDmy || r.doeIso) : (r.doeIso || r.doeDmy);
  const docNum = r.docNumber || getElVal('req_visaNumber') || '7011172155';
  const saudiAddr = r.saudiAddress || getElVal('req_address') || 'جده';
  const phone = r.phone || getElVal('req_phone') || '0582625697';
  const email = r.email || 'sayedabdo8888@gmail.com';

  const summary = 
`📄 *ملخص طلب تأشيرة دخول للمملكة من الممثليات السعودية بالخارج (منصة إنجاز)*
═════════════════════════════════════════
• نوع التأشيرة: ${r.visaType || 'زيارة عائلية'}
• الجنسية الحالية: ${r.nationalityAr || 'مصر'}
• بلد الإقامة: ${r.residenceCountry || 'مصر'}
• أقرب ممثلية: ${r.closestMission || r.arrivalPort || 'الاسكندرية'}
• رقم المستند: ${docNum}
─────────────────────────────────────────
• الاسم بالعربي: ${r.fullNameAr || [r.firstNameAr, r.fatherNameAr, r.grandFatherNameAr, r.familyNameAr].filter(Boolean).join(' ')}
  (الأول: ${r.firstNameAr} | الأب: ${r.fatherNameAr} | الجد: ${r.grandFatherNameAr} | العائلة: ${r.familyNameAr})
• الاسم بالإنجليزي: ${r.fullNameEn || [r.firstNameEn, r.fatherNameEn, r.grandFatherNameEn, r.familyNameEn].filter(Boolean).join(' ')}
  (First: ${r.firstNameEn} | Father: ${r.fatherNameEn} | G.Father: ${r.grandFatherNameEn} | Family: ${r.familyNameEn})
─────────────────────────────────────────
• رقم الجواز: ${r.passportNumber} (${r.docType || 'عادي'})
• دولة الإصدار: ${r.placeOfIssue || r.nationalityAr || 'مصر'}
• تاريخ الإصدار: ${doi}
• تاريخ الانتهاء: ${doe}
• مكان الميلاد: ${r.pob || r.placeOfIssue || 'مصر'}
• تاريخ الميلاد: ${dob}
• رقم الهوية: ${r.nationalId || r.personalNumber || '-'}
• الديانة: ${r.religion || 'مسلم'}
• الحالة الاجتماعية: ${r.maritalStatus || 'متزوج'}
• الجنس: ${r.sex || 'أنثى'}
• الحالة المهنية: ${r.employmentStatus || 'لا يعمل'}
• المهنة: ${r.profession || 'ربة منزل'}
• عنوان السكن داخل السعودية: ${saudiAddr}
• صلة القرابة: ${r.relation || 'زوجة'}
• رقم الجوال: ${r.phoneCountryCode || '+966'} ${phone}
• البريد الإلكتروني: ${email}
─────────────────────────────────────────
• الناقل: ${r.carrier || 'جوي'}
• جهة الوصول: ${r.arrivalPort || 'الاسكندرية'}
• التاريخ المتوقع لدخول المملكة: ${r.expectedArrivalDate || '-'}
• الغرض: ${r.visitPurpose || 'زيارة عائلية'}
• رقم الرحلة: ${r.flightNumber || '-'}
═════════════════════════════════════════
✓ تم التجهيز عبر المساعد الذكي لتفريغ التأشيرات السعودية.`;

  copyToClipboard(summary, 'ملخص إنجاز بالكامل');
}

function copyEnjazArFullName() {
  const f = getElVal('ej_firstNameAr');
  const fa = getElVal('ej_fatherNameAr');
  const g = getElVal('ej_grandFatherNameAr');
  const l = getElVal('ej_familyNameAr');
  const full = [f, fa, g, l].filter(Boolean).join(' ');
  copyToClipboard(full, 'الاسم الكامل عربي لإنجاز');
}

function copyEnjazEnFullName() {
  const f = getElVal('ej_firstNameEn');
  const fa = getElVal('ej_fatherNameEn');
  const g = getElVal('ej_grandFatherNameEn');
  const l = getElVal('ej_familyNameEn');
  const full = [f, fa, g, l].filter(Boolean).join(' ');
  copyToClipboard(full, 'الاسم الكامل إنجليزي لإنجاز');
}

function simulateSendOtp() {
  const phone = getElVal('ej_phone') || getElVal('req_phone') || '0582625697';
  const code = Math.floor(1000 + Math.random() * 9000);
  copyToClipboard(String(code), `رمز التحقق (${code})`);
  showToast(`تم نسخ رمز التحقق (${code}) المرسل إلى ${phone} ✓`, 'success');
}

function togglePrevNatField(show) {
  const box = document.getElementById('ej_prevNatContainer');
  if (box) {
    if (show) box.classList.remove('hidden');
    else box.classList.add('hidden');
  }
}

// ─── ENJAZ 200x200 PHOTO ENGINE ──────────────────────────────────────────────
function handleEnjazPhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    processPhotoToEnjazFormat(e.target.result);
  };
  reader.readAsDataURL(file);
}

function processPhotoToEnjazFormat(imageSrc) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // 1. Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 200, 200);

    // 2. Draw centered image keeping aspect ratio
    const scale = Math.min(200 / img.width, 200 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (200 - w) / 2;
    const y = (200 - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    if (!state.currentRecord) state.currentRecord = createEmptyRecord();
    state.currentRecord.photoDataUrl = dataUrl;

    const ejPhotoImg = document.getElementById('ej_photoImg');
    const ejPhotoPlaceholder = document.getElementById('ej_photoPlaceholder');
    if (ejPhotoImg && ejPhotoPlaceholder) {
      ejPhotoImg.src = dataUrl;
      ejPhotoImg.classList.remove('hidden');
      ejPhotoPlaceholder.classList.add('hidden');
    }

    playHapticBeep(1000, 'sine', 0.05);
    showToast('تمت معالجة الصورة بمقاس 200×200 وخلفية بيضاء معتمدة لإنجاز ✓', 'success');
  };
  img.src = imageSrc;
}

function downloadEnjazPhoto() {
  if (!state.currentRecord || !state.currentRecord.photoDataUrl) {
    showToast('يرجى اختيار أو رفع صورة شخصية أولاً', 'error');
    return;
  }
  const a = document.createElement('a');
  a.href = state.currentRecord.photoDataUrl;
  const pass = state.currentRecord.passportNumber || 'photo';
  a.download = `enjaz_photo_${pass}_200x200.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('تم تنزيل الصورة 200×200 بنجاح ✓', 'success');
}

function getElVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ─── TEST SAMPLES (PRESET REAL PASSPORTS) ───────────────────────────────────
const TEST_SAMPLES = {
  wife_asmaa: `P<EGYIBRAHIM<<ASMAA<MOHAMED<ABDELGHAFAR<<<<<<
A360490888EGY9212107F3012176<<<<<<<<<<<<<<<00`,
  daughter_kyan: `P<EGYBESSAR<<KYAN<ELSAYED<ABDELMONEM<ELSAYED
A279436427EGY2010016F2803146<<<<<<<<<<<<<<<00`,
  daughter_lyan: `P<EGYBESSAR<<LYAN<ELSAYED<ABDELMONEM<ELSAYED
A406063403EGY1712173F3201314<<<<<<<<<<<<<<<02`,
  daughter_myan: `P<EGYBESSAR<<MYAN<ELSAYED<ABDELMONEM<ELSAYED
A405068216EGY2411244F3201255<<<<<<<<<<<<<<<02`,
  wife_egypt: `P<EGYFATMA<<AHMED<MAHMOUD<<<<<<<<<<<<<<<<<<<<
A112233445EGY9205142F3101015<<<<<<<<<<<<<<02`
};

const BESSAR_FAMILY_RECORDS = [
  {
    id: 'bessar_asmaa',
    passportNumber: 'A36049088',
    docType: 'عادي',
    docNumber: '7011172155',
    nationalityCode: 'EGY',
    nationalityAr: 'مصر',
    nationalityEn: 'Egypt',
    firstNameAr: 'أسماء',
    fatherNameAr: 'محمد',
    grandFatherNameAr: 'عبد الغفار',
    familyNameAr: 'ابراهيم',
    fullNameAr: 'أسماء محمد عبد الغفار ابراهيم',
    firstNameEn: 'ASMAA',
    fatherNameEn: 'MOHAMED',
    grandFatherNameEn: 'ABDELGHAFAR',
    familyNameEn: 'IBRAHIM',
    fullNameEn: 'ASMAA MOHAMED ABDELGHAFAR IBRAHIM',
    dobIso: '1992/12/10',
    dobDmy: '10/12/1992',
    pob: 'المنوفية',
    religion: 'مسلم',
    profession: 'ربة منزل',
    employmentStatus: 'لا يعمل',
    isUnemployed: true,
    sex: 'أنثى',
    sexEn: 'Female',
    relation: 'زوجة',
    phone: '0582625697',
    email: 'sayedabdo8888@gmail.com',
    doiIso: '2023/12/18',
    doiDmy: '18/12/2023',
    doeIso: '2030/12/17',
    doeDmy: '17/12/2030',
    placeOfIssue: 'المنوفية',
    carrier: 'جوا',
    arrivalPort: 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم',
    expectedArrivalDate: '2026/09/30',
    visitPurpose: 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار',
    entriesCount: '',
    stayDuration: '',
    mrzRaw: 'P<EGYIBRAHIM<<ASMAA<MOHAMED<ABDELGHAFAR<<<<<<\nA360490888EGY9212107F3012176<<<<<<<<<<<<<<<00'
  },
  {
    id: 'bessar_kyan',
    passportNumber: 'A27943642',
    docType: 'عادي',
    docNumber: '7011172155',
    nationalityCode: 'EGY',
    nationalityAr: 'مصر',
    nationalityEn: 'Egypt',
    firstNameAr: 'كيان',
    fatherNameAr: 'السيد',
    grandFatherNameAr: 'عبد المنعم',
    familyNameAr: 'بصار',
    fullNameAr: 'كيان السيد عبد المنعم السيد بصار',
    firstNameEn: 'KYAN',
    fatherNameEn: 'ELSAYED',
    grandFatherNameEn: 'ABDELMONEM',
    familyNameEn: 'BESSAR',
    fullNameEn: 'KYAN ELSAYED ABDELMONEM ELSAYED BESSAR',
    dobIso: '2020/10/01',
    dobDmy: '01/10/2020',
    pob: 'المنوفية',
    religion: 'مسلم',
    profession: 'طفله',
    employmentStatus: 'لا يعمل',
    isUnemployed: true,
    sex: 'أنثى',
    sexEn: 'Female',
    relation: 'بنت',
    phone: '0582625697',
    email: 'sayedabdo8888@gmail.com',
    doiIso: '2021/03/15',
    doiDmy: '15/03/2021',
    doeIso: '2028/03/14',
    doeDmy: '14/03/2028',
    placeOfIssue: 'المنوفية',
    carrier: 'جوا',
    arrivalPort: 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم',
    expectedArrivalDate: '2026/09/30',
    visitPurpose: 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار',
    entriesCount: '',
    stayDuration: '',
    mrzRaw: 'P<EGYBESSAR<<KYAN<ELSAYED<ABDELMONEM<ELSAYED\nA279436427EGY2010016F2803146<<<<<<<<<<<<<<<00'
  },
  {
    id: 'bessar_lyan',
    passportNumber: 'A40606340',
    docType: 'عادي',
    docNumber: '7011172155',
    nationalityCode: 'EGY',
    nationalityAr: 'مصر',
    nationalityEn: 'Egypt',
    firstNameAr: 'ليان',
    fatherNameAr: 'السيد',
    grandFatherNameAr: 'عبد المنعم',
    familyNameAr: 'بصار',
    fullNameAr: 'ليان السيد عبد المنعم السيد بصار',
    firstNameEn: 'LYAN',
    fatherNameEn: 'ELSAYED',
    grandFatherNameEn: 'ABDELMONEM',
    familyNameEn: 'BESSAR',
    fullNameEn: 'LYAN ELSAYED ABDELMONEM ELSAYED BESSAR',
    dobIso: '2017/12/17',
    dobDmy: '17/12/2017',
    pob: 'المنوفية',
    religion: 'مسلم',
    profession: 'طالبة',
    employmentStatus: 'لا يعمل',
    isUnemployed: true,
    sex: 'أنثى',
    sexEn: 'Female',
    relation: 'بنت',
    phone: '0582625697',
    email: 'sayedabdo8888@gmail.com',
    doiIso: '2025/02/01',
    doiDmy: '01/02/2025',
    doeIso: '2032/01/31',
    doeDmy: '31/01/2032',
    placeOfIssue: 'المنوفية',
    carrier: 'جوا',
    arrivalPort: 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم',
    expectedArrivalDate: '2026/09/30',
    visitPurpose: 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار',
    entriesCount: '',
    stayDuration: '',
    mrzRaw: 'P<EGYBESSAR<<LYAN<ELSAYED<ABDELMONEM<ELSAYED\nA406063403EGY1712173F3201314<<<<<<<<<<<<<<<02'
  },
  {
    id: 'bessar_myan',
    passportNumber: 'A40506821',
    docType: 'عادي',
    docNumber: '7011172155',
    nationalityCode: 'EGY',
    nationalityAr: 'مصر',
    nationalityEn: 'Egypt',
    firstNameAr: 'ميان',
    fatherNameAr: 'السيد',
    grandFatherNameAr: 'عبد المنعم',
    familyNameAr: 'بصار',
    fullNameAr: 'ميان السيد عبد المنعم السيد بصار',
    firstNameEn: 'MYAN',
    fatherNameEn: 'ELSAYED',
    grandFatherNameEn: 'ABDELMONEM',
    familyNameEn: 'BESSAR',
    fullNameEn: 'MYAN ELSAYED ABDELMONEM ELSAYED BESSAR',
    dobIso: '2024/11/24',
    dobDmy: '24/11/2024',
    pob: 'المنوفية',
    religion: 'مسلم',
    profession: 'طفله',
    employmentStatus: 'لا يعمل',
    isUnemployed: true,
    sex: 'أنثى',
    sexEn: 'Female',
    relation: 'بنت',
    phone: '0582625697',
    email: 'sayedabdo8888@gmail.com',
    doiIso: '2025/01/26',
    doiDmy: '26/01/2025',
    doeIso: '2032/01/25',
    doeDmy: '25/01/2032',
    placeOfIssue: 'المنوفية',
    carrier: 'جوا',
    arrivalPort: 'مطار الأمير نائف بن عبدالعزيز الدولي بالقصيم',
    expectedArrivalDate: '2026/09/30',
    visitPurpose: 'زيارة عائلية لـ السيد عبدالمنعم السيد بصار',
    entriesCount: '',
    stayDuration: '',
    mrzRaw: 'P<EGYBESSAR<<MYAN<ELSAYED<ABDELMONEM<ELSAYED\nA405068216EGY2411244F3201255<<<<<<<<<<<<<<<02'
  }
];

function loadTestSample(key) {
  const sample = TEST_SAMPLES[key];
  if (!sample) return;
  const parsed = parseMRZ(sample);
  if (parsed) {
    state.currentRecord = recordFromParsedMRZ(parsed);
    
    // Custom name enrichments for the real passports matching official documents
    const activeCtx = getActiveVisaContext();
    state.currentRecord.carrier = activeCtx.carrier;
    state.currentRecord.arrivalPort = activeCtx.arrivalPort;
    state.currentRecord.visitPurpose = activeCtx.visitPurpose;
    state.currentRecord.docNumber = activeCtx.docNum;
    state.currentRecord.email = activeCtx.email;
    state.currentRecord.phone = activeCtx.phone;
    state.currentRecord.saudiAddress = activeCtx.saudiAddress;
    state.currentRecord.expectedArrivalDate = activeCtx.expectedArrivalDate;
    state.currentRecord.employmentStatus = 'لا يعمل';
    state.currentRecord.isUnemployed = true;

    if (key === 'wife_asmaa') {
      state.currentRecord.firstNameAr = 'أسماء';
      state.currentRecord.fatherNameAr = 'محمد';
      state.currentRecord.grandFatherNameAr = 'عبد الغفار';
      state.currentRecord.familyNameAr = 'ابراهيم';
      state.currentRecord.fullNameAr = 'أسماء محمد عبد الغفار ابراهيم';
      state.currentRecord.relation = 'زوجة';
      state.currentRecord.profession = 'ربة منزل';
      state.currentRecord.pob = 'المنوفية';
      state.currentRecord.placeOfIssue = 'المنوفية';
      state.currentRecord.doiIso = '2023/12/18';
      state.currentRecord.doeIso = '2030/12/17';
    } else if (key === 'daughter_kyan') {
      state.currentRecord.firstNameAr = 'كيان';
      state.currentRecord.fatherNameAr = 'السيد';
      state.currentRecord.grandFatherNameAr = 'عبد المنعم';
      state.currentRecord.familyNameAr = 'بصار';
      state.currentRecord.fullNameAr = 'كيان السيد عبد المنعم السيد بصار';
      state.currentRecord.relation = 'بنت';
      state.currentRecord.profession = 'طفله';
      state.currentRecord.pob = 'المنوفية';
      state.currentRecord.placeOfIssue = 'المنوفية';
      state.currentRecord.doiIso = '2021/03/15';
      state.currentRecord.doeIso = '2028/03/14';
    } else if (key === 'daughter_lyan') {
      state.currentRecord.firstNameAr = 'ليان';
      state.currentRecord.fatherNameAr = 'السيد';
      state.currentRecord.grandFatherNameAr = 'عبد المنعم';
      state.currentRecord.familyNameAr = 'بصار';
      state.currentRecord.fullNameAr = 'ليان السيد عبد المنعم السيد بصار';
      state.currentRecord.relation = 'بنت';
      state.currentRecord.profession = 'طالبة';
      state.currentRecord.pob = 'المنوفية';
      state.currentRecord.placeOfIssue = 'المنوفية';
      state.currentRecord.doiIso = '2025/02/01';
      state.currentRecord.doeIso = '2032/01/31';
    } else if (key === 'daughter_myan') {
      state.currentRecord.firstNameAr = 'ميان';
      state.currentRecord.fatherNameAr = 'السيد';
      state.currentRecord.grandFatherNameAr = 'عبد المنعم';
      state.currentRecord.familyNameAr = 'بصار';
      state.currentRecord.fullNameAr = 'ميان السيد عبد المنعم السيد بصار';
      state.currentRecord.relation = 'بنت';
      state.currentRecord.profession = 'طفله';
      state.currentRecord.pob = 'المنوفية';
      state.currentRecord.placeOfIssue = 'المنوفية';
      state.currentRecord.doiIso = '2025/01/26';
      state.currentRecord.doeIso = '2032/01/25';
    }

    populateUIFromRecord();
    showToast(`تم تفريغ جواز: ${state.currentRecord.fullNameAr || key}`, 'success');
  }
}

function loadBessarFamilyFullBatch() {
  state.familyMembers = [...BESSAR_FAMILY_RECORDS];
  state.currentRecord = { ...BESSAR_FAMILY_RECORDS[0] };
  state.selectedMemberId = state.currentRecord.id;
  populateUIFromRecord();
  renderFamilyMembersTable();
  renderEnjazFamilySwitcher();
  playHapticBeep(950, 'sine', 0.1);
  showToast('تم تحميل عائلة السيد بصار كاملة (4 مطلوبين للزيارة) بنجاح ✓', 'success');
}

// ─── RESET & PREPARE FOR NEW PASSPORTS (تفريغ وتجهيز لاستقبال جوازات جديدة) ───
function resetCurrentPassportForm() {
  state.currentRecord = createEmptyRecord();
  applyActiveVisaContext(state.currentRecord);
  state.selectedMemberId = null;

  // تفريغ البيانات الشخصية للشخص السابق مع الحفاظ 100% على ثوابت الطلب
  state.currentRecord.passportNumber = '';
  state.currentRecord.firstNameAr = '';
  state.currentRecord.fatherNameAr = '';
  state.currentRecord.grandFatherNameAr = '';
  state.currentRecord.familyNameAr = '';
  state.currentRecord.fullNameAr = '';
  state.currentRecord.firstNameEn = '';
  state.currentRecord.fatherNameEn = '';
  state.currentRecord.grandFatherNameEn = '';
  state.currentRecord.familyNameEn = '';
  state.currentRecord.fullNameEn = '';
  state.currentRecord.dobIso = '';
  state.currentRecord.dobDmy = '';
  state.currentRecord.dobHijri = '';
  state.currentRecord.doiIso = '';
  state.currentRecord.doiDmy = '';
  state.currentRecord.doiHijri = '';
  state.currentRecord.doeIso = '';
  state.currentRecord.doeDmy = '';
  state.currentRecord.doeHijri = '';
  state.currentRecord.nationalId = '';
  state.currentRecord.personalNumber = '';
  state.currentRecord.photoDataUrl = '';
  state.currentRecord.mrzRaw = '';

  populateUIFromRecord();

  // تفريغ كود الـ MRZ والصور المرفوعة وحقول الإدخال الشخصية
  const mrz = document.getElementById('mrzTextInput');
  if (mrz) mrz.value = '';
  const fileInput = document.getElementById('passportFileInput');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('passportPreviewImg');
  const placeholder = document.getElementById('dropZonePlaceholder');
  const strip = document.getElementById('passportsThumbnailsStrip');
  if (preview && placeholder) {
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
  if (strip) strip.classList.add('hidden');

  const ejPhotoImg = document.getElementById('ej_photoImg');
  const ejPhotoPlaceholder = document.getElementById('ej_photoPlaceholder');
  const ejFileInput = document.getElementById('ej_photoFileInput');
  if (ejPhotoImg && ejPhotoPlaceholder) {
    ejPhotoImg.src = '';
    ejPhotoImg.classList.add('hidden');
    ejPhotoPlaceholder.classList.remove('hidden');
  }
  if (ejFileInput) ejFileInput.value = '';

  // تحديث شارة الشخص المختار
  const badgeDisp = document.getElementById('activePersonNameDisplay');
  if (badgeDisp) badgeDisp.textContent = '(نموذج جديد فارغ - بانتظار رفع أو مسح الجواز)';
  const ejBadgeDisp = document.getElementById('ej_activePersonNameDisplay');
  if (ejBadgeDisp) ejBadgeDisp.textContent = '(نموذج جديد فارغ - سيتم تطبيق بيانات الطلب تلقائياً)';

  // تمرير سلس لمنطقة رفع الجواز
  const dropZone = document.getElementById('imageDropZone');
  if (dropZone && state.activeTab === 'tasheer') {
    dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    dropZone.classList.add('ring-4', 'ring-emerald-400');
    setTimeout(() => dropZone.classList.remove('ring-4', 'ring-emerald-400'), 1600);
  }

  playHapticBeep(880, 'sine', 0.08);
  showToast('تم تفريغ النموذج وتجهيزه لاستقبال الجواز الجديد مع الاحتفاظ ببيانات الطلب ✓', 'success');
}

function triggerNewPassportUpload() {
  const fileInput = document.getElementById('passportFileInput');
  if (fileInput) {
    fileInput.click();
    showToast('اختر صورة الجواز الجديد للبدء في التفريغ الآلي ⚡', 'info');
  }
}

function resetAllFamilyAndForms() {
  if (state.familyMembers && state.familyMembers.length > 0) {
    const confirmReset = confirm('هل أنت متأكد من تفريغ كافة البيانات وقائمة المطلوبين للزيارة للبدء من جديد مع عميل/عائلة جديدة؟');
    if (!confirmReset) return;
  }

  state.familyMembers = [];
  resetCurrentPassportForm();
  renderFamilyMembersTable();
  renderEnjazFamilySwitcher();
  
  const countBadge = document.getElementById('familyCountBadge');
  if (countBadge) countBadge.textContent = '0 أشخاص';
  const ejCounterBadge = document.getElementById('ej_memberCounterBadge');
  if (ejCounterBadge) ejCounterBadge.textContent = '0 من 0';

  playHapticBeep(700, 'triangle', 0.12);
  showToast('تم تفريغ القائمة بالكامل بنجاح ✓ النظام جاهز لاستقبال بيانات عميل جديد', 'info');
}

// ─── COPY FULL SUMMARY (WHATSAPP / CLIENT TEXT) ──────────────────────────────
function copyFullSummaryText() {
  updateRecordFromUI();
  if (!state.currentRecord) return;
  const r = state.currentRecord;
  const summary = 
`📄 *بيانات الشخص المطلوب للزيارة (منصة التأشيرات السعودية):*
────────────────────
• *رقم الجواز:* ${r.passportNumber} (${r.docType})
• *الاسم الكامل (عربي):* ${r.fullNameAr}
• *الاسم الكامل (إنجليزي):* ${r.fullNameEn}
• *الجنسية:* ${r.nationalityAr}
• *صلة القرابة:* ${r.relation}
• *تاريخ الميلاد:* ${r.dobIso || r.dobDmy}
• *محل الميلاد:* ${r.pob}
• *المهنة:* ${r.profession}
• *الجنس:* ${r.sex}
• *الديانة:* ${r.religion}
• *تاريخ الإصدار:* ${r.doiIso || r.doiDmy}
• *تاريخ الانتهاء:* ${r.doeIso || r.doeDmy}
• *مكان إصدار الجواز:* ${r.placeOfIssue}
• *جهة القدوم:* ${r.arrivalPort}
• *الغرض من الزيارة:* ${r.visitPurpose || 'زيارة عائلية'}
• *عدد مرات الدخول:* ${r.entriesCount || '-'}
• *مدة الإقامة:* ${r.stayDuration ? `${r.stayDuration} يوم` : '-'}
────────────────────
✓ تم التجهيز عبر المساعد المكتبي لمنصة التأشيرات.`;

  copyToClipboard(summary, 'الملخص الكامل');
}

// ─── INITIALIZATION & EVENT LISTENERS ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadVaultRecords();

  // MRZ Textarea Input Listener
  const mrzInput = document.getElementById('mrzTextInput');
  if (mrzInput) {
    mrzInput.addEventListener('input', (e) => {
      const text = e.target.value;
      if (text.includes('P<') || text.length >= 44) {
        const parsed = parseMRZ(text);
        if (parsed) {
          state.currentRecord = recordFromParsedMRZ(parsed);
          populateUIFromRecord();
          showToast('تم تفريغ كود الـ MRZ آلياً بنجاح ✓', 'success');
        }
      }
    });
  }

  // Keyboard Shortcuts: Space / Alt+C for Sequential Copy, Alt+ArrowRight / Alt+ArrowLeft for switching family members
  window.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if ((e.key === ' ' && !isTyping) || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
      e.preventDefault();
      nextSequentialStep();
    } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
      e.preventDefault();
      nextFamilyMember();
    } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
      e.preventDefault();
      prevFamilyMember();
    }
  });

  // Image Drag & Drop
  const dropZone = document.getElementById('imageDropZone');
  const fileInput = document.getElementById('passportFileInput');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-emerald-500', 'bg-emerald-50/50');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
      });
    });

    // Passports Drag & Drop
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleMultiplePassportFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) handleMultiplePassportFiles(e.target.files);
    });
  }

  // Visa Document Drag & Drop
  const visaDropZone = document.getElementById('visaDropZone');
  const visaFileInput = document.getElementById('visaFileInput');

  if (visaDropZone && visaFileInput) {
    ['dragenter', 'dragover'].forEach(name => {
      visaDropZone.addEventListener(name, (e) => {
        e.preventDefault();
        visaDropZone.classList.add('border-indigo-500', 'bg-indigo-50/70');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      visaDropZone.addEventListener(name, (e) => {
        e.preventDefault();
        visaDropZone.classList.remove('border-indigo-500', 'bg-indigo-50/70');
      });
    });

    visaDropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) handleVisaFile(files[0]);
    });

    visaFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleVisaFile(e.target.files[0]);
    });
  }
});

let uploadedPassportFiles = [];
function handleMultiplePassportFiles(files) {
  const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!fileList.length) {
    showToast('يرجى اختيار صور صالحة للجوازات', 'error');
    return;
  }

  uploadedPassportFiles = fileList;
  const countEl = document.getElementById('uploadedPassportsCount');
  if (countEl) countEl.textContent = `${uploadedPassportFiles.length} جواز مرفوع`;

  const strip = document.getElementById('passportsThumbnailsStrip');
  const placeholder = document.getElementById('dropZonePlaceholder');
  if (strip) {
    strip.innerHTML = '';
    strip.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    uploadedPassportFiles.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const thumb = document.createElement('img');
        thumb.src = e.target.result;
        thumb.title = `جواز ${idx + 1}: ${f.name}`;
        thumb.className = `max-h-20 rounded-lg object-contain border-2 cursor-pointer transition ${idx === 0 ? 'border-emerald-600 shadow-md ring-2 ring-emerald-300' : 'border-slate-300 hover:border-emerald-400'}`;
        thumb.onclick = (event) => {
          event.stopPropagation();
          strip.querySelectorAll('img').forEach(img => {
            img.className = 'max-h-20 rounded-lg object-contain border-2 cursor-pointer transition border-slate-300 hover:border-emerald-400';
          });
          thumb.className = 'max-h-20 rounded-lg object-contain border-2 cursor-pointer transition border-emerald-600 shadow-md ring-2 ring-emerald-300';
          showToast(`تم تفعيل معاينة الجواز: ${f.name}`, 'info');
        };
        strip.appendChild(thumb);
      };
      reader.readAsDataURL(f);
    });

    const statusEl = document.getElementById('passportStatusText');
    if (statusEl) statusEl.textContent = `جاري المعالجة الآلية لـ ${uploadedPassportFiles.length} جواز... ⚡`;
    showToast(`تم بدء التفريغ الآلي لـ ${uploadedPassportFiles.length} جواز سفر ⚡`, 'info');

    // Start Automatic Sequential Processing for all dropped passports
    processPassportsBatchSequentially(uploadedPassportFiles);
  }
}

async function processPassportsBatchSequentially(files) {
  const statusEl = document.getElementById('passportStatusText');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (statusEl) statusEl.textContent = `جاري مسح الجواز (${i + 1} من ${files.length}): ${file.name}...`;

    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = new Image();
      await new Promise(resolve => {
        img.onload = resolve;
        img.src = dataUrl;
      });

      // Try automatic OCR on MRZ
      if (window.localOCR) {
        const scanRes = await window.localOCR.scanPassportImage(img, (pMsg) => {
          if (statusEl) statusEl.textContent = `[${i + 1}/${files.length}] ${pMsg}`;
        });

        if (scanRes && scanRes.success && scanRes.mrz) {
          const parsed = parseMRZ(scanRes.mrz);
          if (parsed) {
            const rec = recordFromParsedMRZ(parsed);
            
            // Auto match with known family member specs if matches passport number
            const knownMatch = BESSAR_FAMILY_RECORDS.find(k => k.passportNumber === rec.passportNumber);
            if (knownMatch) {
              rec.firstNameAr = knownMatch.firstNameAr;
              rec.fatherNameAr = knownMatch.fatherNameAr;
              rec.grandFatherNameAr = knownMatch.grandFatherNameAr;
              rec.familyNameAr = knownMatch.familyNameAr;
              rec.fullNameAr = knownMatch.fullNameAr;
              rec.profession = knownMatch.profession;
              rec.relation = knownMatch.relation;
              rec.pob = knownMatch.pob;
              rec.placeOfIssue = knownMatch.placeOfIssue;
              if (knownMatch.doiIso) rec.doiIso = knownMatch.doiIso;
              if (knownMatch.doeIso) rec.doeIso = knownMatch.doeIso;
            }

            // تطبيق ثوابت طلب الزيارة المشتركة لكافة الجوازات (رقم المستند، جهة القدوم، الناقل، الغرض، الإيميل)
            applyActiveVisaContext(rec);

            // Check if already in queue by passport number
            const existingIdx = state.familyMembers.findIndex(m => m.passportNumber === rec.passportNumber);
            if (existingIdx >= 0) {
              state.familyMembers[existingIdx] = rec;
            } else {
              state.familyMembers.push(rec);
            }
            state.currentRecord = rec;
            state.selectedMemberId = rec.id;
            populateUIFromRecord();
            renderFamilyMembersTable();
            renderEnjazFamilySwitcher();
            saveRecordToVault(rec);
            playHapticBeep(850, 'sine', 0.06);
            showToast(`تم تفريغ الجواز ${i + 1} وتطبيق بيانات التأشيرة تلقائياً: ${rec.passportNumber} ✓`, 'success');
          }
        }
      }
    } catch (err) {
      console.warn('Batch item processing notice:', err.message);
    }
  }

  if (statusEl) statusEl.textContent = `اكتمل التفريغ التلقائي (${state.familyMembers.length} مطلوبين للزيارة) ✓`;
  playHapticBeep(950, 'sine', 0.12);
  showToast('اكتمل التفريغ الآلي لجميع الجوازات المرفوعة بنجاح ✓', 'success');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleVisaFile(file) {
  const imgEl = document.getElementById('visaPreviewImg');
  const placeholderEl = document.getElementById('visaDropPlaceholder');
  const statusEl = document.getElementById('visaStatusText');

  if (file.type.startsWith('image/')) {
    const dataUrl = await readFileAsDataURL(file);
    if (imgEl && placeholderEl) {
      imgEl.src = dataUrl;
      imgEl.classList.remove('hidden');
      placeholderEl.classList.add('hidden');
    }
    if (statusEl) statusEl.textContent = `جاري مسح مستند التأشيرة ضوئياً بالذكاء الاصطناعي... ⚡`;
    showToast('جاري تفريغ مستند التأشيرة آلياً... ⚡', 'info');

    // Run Automatic Visa OCR
    try {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = dataUrl; });

      if (window.localOCR) {
        const scanRes = await window.localOCR.scanVisaDocument(img, (msg) => {
          if (statusEl) statusEl.textContent = msg;
        });

        if (scanRes && scanRes.success && scanRes.text) {
          const txt = document.getElementById('visaTextInput');
          if (txt) txt.value = scanRes.text;
          extractVisaDataAction();
          return;
        }
      }
    } catch (err) {
      console.warn('Visa auto scan error:', err);
    }

    if (statusEl) statusEl.textContent = `تم رفع المستند: ${file.name}`;
    showToast('تم تحميل المستند بنجاح', 'info');
  } else {
    // If text / pdf, read text directly
    const reader = new FileReader();
    reader.onload = (e) => {
      const txt = document.getElementById('visaTextInput');
      if (txt) {
        txt.value = e.target.result;
        extractVisaDataAction();
      }
    };
    reader.readAsText(file);
  }
}

// ─── GLOBAL AUTOMATIC CLIPBOARD PASTE (Ctrl+V) ──────────────────────────────
window.addEventListener('paste', async (e) => {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  // 1. If pasting text
  const text = clipboardData.getData('text');
  if (text) {
    if (text.includes('P<') || (text.length >= 44 && text.includes('<<'))) {
      e.preventDefault();
      const mrzEl = document.getElementById('mrzTextInput');
      if (mrzEl) mrzEl.value = text;
      const parsed = parseMRZ(text);
      if (parsed) {
        const rec = recordFromParsedMRZ(parsed);
        applyActiveVisaContext(rec);
        state.currentRecord = rec;
        state.selectedMemberId = rec.id;

        const existingIdx = state.familyMembers.findIndex(m => m.passportNumber === rec.passportNumber);
        if (existingIdx >= 0) {
          state.familyMembers[existingIdx] = rec;
        } else {
          state.familyMembers.push(rec);
        }

        populateUIFromRecord();
        renderFamilyMembersTable();
        renderEnjazFamilySwitcher();
        saveRecordToVault(rec);
        playHapticBeep(850, 'sine', 0.08);
        showToast(`تم لصق وتفريغ كود الجواز مع تطبيق بيانات التأشيرة تلقائياً: ${rec.passportNumber} ✓`, 'success');
      }
      return;
    } else if (text.includes('رقم المستند') || text.includes('تأشيرة') || text.includes('السجل التجاري')) {
      e.preventDefault();
      const visaTxt = document.getElementById('visaTextInput');
      if (visaTxt) visaTxt.value = text;
      extractVisaDataAction();
      return;
    }
  }

  // 2. If pasting an image directly from clipboard
  const items = clipboardData.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          showToast('تم التقاط صورة من الحافظة - جاري المعالجة الآلية...', 'info');
          handleMultiplePassportFiles([blob]);
          break;
        }
      }
    }
  }
});

function extractVisaDataAction() {
  const txtInput = document.getElementById('visaTextInput');
  const rawText = txtInput ? txtInput.value.trim() : '';

  if (!rawText) {
    showToast('يرجى لصق نص مستند التأشيرة أو تجربة النموذج الجاهز', 'info');
    return;
  }

  if (typeof parseVisaDocumentText !== 'function') {
    showToast('محلل التأشيرة جاري تحميله...', 'error');
    return;
  }

  const parsed = parseVisaDocumentText(rawText);
  if (!parsed) {
    showToast('لم يتم التعرف على بيانات صالحة في المستند', 'error');
    return;
  }

  let extractedCount = 0;

  // 1. Fill Visa / CR / Company fields
  if (parsed.visaNumber) {
    setVal('req_visaNumber', parsed.visaNumber);
    extractedCount++;
  }
  if (parsed.crNumber) {
    setVal('req_crNumber', parsed.crNumber);
    extractedCount++;
  }
  if (parsed.companyName) {
    setVal('req_companyName', parsed.companyName);
    extractedCount++;
  }
  if (parsed.requesterIqama) {
    setVal('req_iqama', parsed.requesterIqama);
    extractedCount++;
  }
  if (parsed.requesterName) {
    setVal('req_name', parsed.requesterName);
    extractedCount++;
  }

  // 2. Fill Visit fields (فقط إذا كانت محددة في المستند وليست فارغة)
  if (parsed.arrivalPort) {
    setVal('f_arrivalPort', parsed.arrivalPort);
    setVal('ej_closestMission', parsed.arrivalPort);
    setVal('ej_arrivalPort', parsed.arrivalPort);
    extractedCount++;
  }
  if (parsed.visitPurpose) {
    setVal('f_visitPurpose', parsed.visitPurpose);
    setVal('ej_visitPurpose', parsed.visitPurpose);
    extractedCount++;
  }
  if (parsed.visaNumber) {
    setVal('ej_docNumber', parsed.visaNumber);
  }
  setVal('f_entriesCount', parsed.entriesCount || '');
  setVal('f_stayDuration', parsed.stayDuration || '');
  if (parsed.entriesCount) extractedCount++;
  if (parsed.stayDuration) extractedCount++;

  // Save to persistent requester profile
  saveRequesterProfile();

  const statusEl = document.getElementById('visaStatusText');
  if (statusEl) {
    statusEl.textContent = `تم تفريغ ${extractedCount} حقول من التأشيرة بنجاح ✓`;
  }

  playHapticBeep(900, 'sine', 0.08);
  showToast(`تم تفريغ ${extractedCount} حقول من مستند التأشيرة بنجاح ✓`, 'success');
}

function loadSampleVisa() {
  const sample = `المملكة العربية السعودية
وزارة الخارجية
مستند تأشيرة
رقم المستند: 7011172155
تاريخ المستند: 1448/03/24
الطلب صالح لتاريخ: 05/12/2026
اسم صاحب الطلب: السيد عبدالمنعم السيد بصار
الجنسية: مصر
رقم السجل: 2339665362
العنوان: جده
رقم الجوال: 0582625697
جهة القدوم: الاسكندرية
نوع التأشيرة: زيارة عائلية
المطلوبين للزيارة:
1. اسماء محمد عبدالغفار ابراهيم - جواز A36049088 - زوجه
2. كيان السيد عبدالمنعم بصار - جواز A27943642 - بنت
3. ليان السيد عبدالمنعم بصار - جواز A40606340 - بنت
4. ميان السيد عبدالمنعم بصار - جواز A40506821 - بنت`;

  const txt = document.getElementById('visaTextInput');
  if (txt) {
    txt.value = sample;
    extractVisaDataAction();
  }
}

// ─── REQUESTER & EMPLOYER PROFILE (طابق تماماً لمستند التأشيرة المرفوع) ───────
const DEFAULT_REQUESTER_PROFILE = {
  name: 'السيد عبدالمنعم السيد بصار',
  iqama: '2339665362',
  dob: '1990/03/27 م | 1410/09/01 هـ',
  iqamaExpiry: '1448/04/16',
  profession: 'مقيم',
  phone: '0582625697',
  email: 'sayedabdo8888@gmail.com',
  address: 'جده',
  crNumber: '2339665362',
  companyName: 'مؤسسة الكفيل',
  visaNumber: '7011172155'
};

function loadRequesterProfile() {
  try {
    const raw = localStorage.getItem('saudi_visa_requester_profile');
    const data = raw ? JSON.parse(raw) : DEFAULT_REQUESTER_PROFILE;
    
    setVal('req_name', data.name || DEFAULT_REQUESTER_PROFILE.name);
    setVal('req_iqama', data.iqama || DEFAULT_REQUESTER_PROFILE.iqama);
    setVal('req_dob', data.dob || DEFAULT_REQUESTER_PROFILE.dob);
    setVal('req_iqamaExpiry', data.iqamaExpiry || DEFAULT_REQUESTER_PROFILE.iqamaExpiry);
    setVal('req_profession', data.profession || DEFAULT_REQUESTER_PROFILE.profession);
    setVal('req_phone', data.phone || DEFAULT_REQUESTER_PROFILE.phone);
    setVal('req_email', data.email || DEFAULT_REQUESTER_PROFILE.email || 'sayedabdo8888@gmail.com');
    setVal('req_address', data.address || DEFAULT_REQUESTER_PROFILE.address);
    setVal('req_crNumber', data.crNumber || DEFAULT_REQUESTER_PROFILE.crNumber);
    setVal('req_companyName', data.companyName || DEFAULT_REQUESTER_PROFILE.companyName);
    setVal('req_visaNumber', data.visaNumber || DEFAULT_REQUESTER_PROFILE.visaNumber);
  } catch (_) {}
}

function saveRequesterProfile() {
  const profile = {
    name: (document.getElementById('req_name') || {}).value || '',
    iqama: (document.getElementById('req_iqama') || {}).value || '',
    dob: (document.getElementById('req_dob') || {}).value || '',
    iqamaExpiry: (document.getElementById('req_iqamaExpiry') || {}).value || '',
    profession: (document.getElementById('req_profession') || {}).value || '',
    phone: (document.getElementById('req_phone') || {}).value || '',
    email: (document.getElementById('req_email') || {}).value || '',
    address: (document.getElementById('req_address') || {}).value || '',
    crNumber: (document.getElementById('req_crNumber') || {}).value || '',
    companyName: (document.getElementById('req_companyName') || {}).value || '',
    visaNumber: (document.getElementById('req_visaNumber') || {}).value || ''
  };
  localStorage.setItem('saudi_visa_requester_profile', JSON.stringify(profile));
  showToast('تم حفظ بيانات صاحب الطلب والمنشأة محلياً بنجاح ✓', 'success');
}

let isEditingRequester = false;
function toggleEditRequester() {
  const btn = document.getElementById('btnToggleEditRequester');
  const fieldIds = [
    'req_name', 'req_iqama', 'req_dob', 'req_iqamaExpiry',
    'req_profession', 'req_phone', 'req_email', 'req_address',
    'req_crNumber', 'req_companyName'
  ];

  isEditingRequester = !isEditingRequester;

  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = !isEditingRequester;
      if (isEditingRequester) {
        el.classList.add('border-blue-500', 'bg-blue-50/30');
      } else {
        el.classList.remove('border-blue-500', 'bg-blue-50/30');
      }
    }
  });

  if (isEditingRequester) {
    if (btn) {
      btn.textContent = '💾 حفظ التعديلات';
      btn.className = 'px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs';
    }
    showToast('تم تفعيل وضع التعديل. عدّل البيانات ثم اضغط حفظ', 'info');
  } else {
    saveRequesterProfile();
    if (btn) {
      btn.textContent = '✏️ تعديل';
      btn.className = 'px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition';
    }
  }
}

function copyAllRequesterData() {
  const name = (document.getElementById('req_name') || {}).value || '';
  const iqama = (document.getElementById('req_iqama') || {}).value || '';
  const dob = (document.getElementById('req_dob') || {}).value || '';
  const iqamaExpiry = (document.getElementById('req_iqamaExpiry') || {}).value || '';
  const profession = (document.getElementById('req_profession') || {}).value || '';
  const phone = (document.getElementById('req_phone') || {}).value || '';
  const email = (document.getElementById('req_email') || {}).value || '';
  const address = (document.getElementById('req_address') || {}).value || '';
  const cr = (document.getElementById('req_crNumber') || {}).value || '';
  const company = (document.getElementById('req_companyName') || {}).value || '';
  const visa = (document.getElementById('req_visaNumber') || {}).value || '';

  const summary = `=== بيانات صاحب الطلب (المقيم) ===
اسم صاحب الطلب: ${name}
رقم الإقامة: ${iqama}
تاريخ الميلاد: ${dob}
تاريخ الانتهاء: ${iqamaExpiry}
المهنة: ${profession}
رقم الجوال: ${phone}
البريد الإلكتروني: ${email}
العنوان: ${address}

=== بيانات جهة العمل ===
رقم السجل: ${cr}
اسم جهة العمل: ${company}
${visa ? `رقم تأشيرة الدخول: ${visa}` : ''}`.trim();

  copyToClipboard(summary, 'كامل بيانات صاحب الطلب وجهة العمل');
}

function scrollToFieldsSection() {
  const target = document.getElementById('fieldsSection');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('ring-4', 'ring-blue-400');
    setTimeout(() => target.classList.remove('ring-4', 'ring-blue-400'), 1500);
    showToast('نموذج إضافة الشخص المطلوب للزيارة جاهز لتعبئة البيانات', 'info');
  }
}

// Auto load requester profile and Bessar family records on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadRequesterProfile();
  if (!state.familyMembers || state.familyMembers.length === 0) {
    loadBessarFamilyFullBatch();
  }
});
