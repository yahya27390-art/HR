/**
 * MRZ Parser & Visa Formats Engine (ICAO Doc 9303)
 * Runs 100% locally on client machine without any network requests.
 */

// ICAO 731 Checksum Multiplier weights
const ICAO_WEIGHTS = [7, 3, 1];

function getIcaoCharValue(char) {
  if (!char || char === '<') return 0;
  if (char >= '0' && char <= '9') return parseInt(char, 10);
  if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 55;
  return 0;
}

function calculateIcaoCheckDigit(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const val = getIcaoCharValue(str[i]);
    const weight = ICAO_WEIGHTS[i % 3];
    sum += val * weight;
  }
  return (sum % 10).toString();
}

function parseDateYYMMDD(yymmdd, isBirth = false) {
  if (!yymmdd || yymmdd.length !== 6) return { iso: '', dmy: '', raw: yymmdd };
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  const dd = parseInt(yymmdd.substring(4, 6), 10);

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  let fullYear;
  if (isBirth) {
    // If birth year is greater than current 2 digits + 1, it's 1900s
    fullYear = yy > (currentYY + 1) ? 1900 + yy : 2000 + yy;
  } else {
    // Passport expiry or issue: if yy > 70 -> 1900s, else 2000s
    fullYear = yy > 70 ? 1900 + yy : 2000 + yy;
  }

  const mmPad = String(mm).padStart(2, '0');
  const ddPad = String(dd).padStart(2, '0');

  return {
    iso: `${fullYear}-${mmPad}-${ddPad}`,
    dmy: `${ddPad}/${mmPad}/${fullYear}`,
    year: fullYear,
    month: mm,
    day: dd,
    raw: yymmdd
  };
}

// Gregorian to Hijri converter (Standard astronomical calculation)
function gregorianToHijri(year, month, day) {
  if (!year || !month || !day) return { text: '', dmy: '', iso: '' };
  
  const m = month;
  let y = year;
  let d = day;

  if (m < 3) {
    y -= 1;
    month += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
  
  // Julian Day to Hijri
  const z = jd - 1948439.5;
  const hYear = Math.floor((30 * z + 10646) / 10631);
  const hMonth = Math.min(12, Math.ceil((z - 29 - (Math.floor((11 * hYear + 3) / 30) + 354 * (hYear - 1))) / 29.5) + 1);
  const hDay = Math.floor(z - (Math.floor((11 * hYear + 3) / 30) + 354 * (hYear - 1) + 29.5 * (hMonth - 1)) + 1);

  const hDayPad = String(Math.max(1, Math.min(30, hDay))).padStart(2, '0');
  const hMonthPad = String(Math.max(1, Math.min(12, hMonth))).padStart(2, '0');
  
  return {
    year: hYear,
    month: hMonth,
    day: hDay,
    dmy: `${hDayPad}/${hMonthPad}/${hYear} هـ`,
    iso: `${hYear}-${hMonthPad}-${hDayPad}`
  };
}

// Common Arabic Phonetic Name Dictionary for Enjaz Quick Fill
const COMMON_ARABIC_NAMES = {
  "MOHAMED": "محمد", "MOHAMMED": "محمد", "MUHAMMAD": "محمد", "MOHAMMAD": "محمد",
  "AHMED": "أحمد", "AHMAD": "أحمد",
  "MAHMOUD": "محمود", "MAHMOD": "محمود",
  "ALI": "علي", "ALY": "علي",
  "HASSAN": "حسن", "HASAN": "حسن",
  "HUSSEIN": "حسين", "HOSSEIN": "حسين", "HOUSSEIN": "حسين",
  "IBRAHIM": "إبراهيم", "EBRAHIM": "إبراهيم",
  "KHALED": "خالد", "KHALID": "خالد",
  "OMAR": "عمر", "OUMAR": "عمر",
  "AMR": "عمرو",
  "YOUSSEF": "يوسف", "YOUSEF": "يوسف", "JOSEPH": "يوسف",
  "MOSTAFA": "مصطفى", "MUSTAFA": "مصطفى",
  "TARIK": "طارق", "TAREQ": "طارق", "TAREK": "طارق",
  "SAID": "سعيد", "SAYED": "سيد",
  "SAMIR": "سمير", "SAMEH": "سامح",
  "ADEL": "عادل", "ADIL": "عادل",
  "YASSER": "ياسر", "YASSIR": "ياسر",
  "HAMED": "حامد", "HAMID": "حامد",
  "WALID": "وليد", "WALEED": "وليد",
  "HANY": "هاني", "HANI": "هاني",
  "HESHAM": "هشام", "HISHAM": "هشام",
  "WAEL": "وائل",
  "OSAMA": "أسامة", "OUSSAMA": "أسامة",
  "KARIM": "كريم", "KAREEM": "كريم",
  "RAMY": "رامي", "RAMI": "رامي",
  "NADER": "نادر",
  "REDHA": "رضا", "REDA": "رضا",
  "SALEH": "صالح", "SALAH": "صلاح",
  "SAMI": "سامي",
  "FATHY": "فتحي", "FATHI": "فتحي",
  "GAMAL": "جمال", "JAMAL": "جمال",
  "MEDHAT": "مدحت",
  "ASHRAF": "أشرف",
  "AYMAN": "أيمن",
  "EMAD": "عماد", "IMAD": "عماد",
  "EHAB": "إيهاب", "IHAB": "إيهاب",
  "ISMAIL": "إسماعيل", "ESMAIL": "إسماعيل",
  "MANSOUR": "منصور",
  "NASSER": "ناصر",
  "SHAABAN": "شعبان",
  "RAMADAN": "رمضان",
  "FATMA": "فاطمة", "FATIMA": "فاطمة",
  "MARIAM": "مريم", "MARYAM": "مريم",
  "SARAH": "سارة", "SARA": "سارة",
  "NOUR": "نور", "NOURA": "نورة",
  "MONA": "منى", "MENNA": "منة",
  "AYA": "آية", "AYAH": "آية",
  "HEBA": "هبة",
  "ASMAA": "أسماء", "ASMA": "أسماء",
  "RANIA": "رانيا",
  "DINA": "دينا",
  "REEM": "ريم",
  "SHEREEF": "شريف", "SHARIF": "شريف",
  "ABDELRAHMAN": "عبد الرحمن", "ABDALLAH": "عبد الله", "ABDULLAH": "عبد الله",
  "ABDELAZIZ": "عبد العزيز", "ABDELFATTAH": "عبد الفتاح"
};

function transliterateNameToAr(enName) {
  if (!enName) return '';
  const clean = enName.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return COMMON_ARABIC_NAMES[clean] || '';
}

/**
 * Parses ICAO TD3 (Passport - 2 lines of 44 chars) or TD1 (3 lines of 30 chars)
 */
function parseMRZ(rawText) {
  if (!rawText) return null;

  // Clean lines and keep only valid alphanumeric + '<'
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim().toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter(l => l.length >= 28);

  if (lines.length < 2) return null;

  let line1 = '';
  let line2 = '';

  // Case 1: Standard Passport (TD3 - 2 lines of 44 chars)
  const td3Lines = lines.filter(l => l.length === 44 || (l.length >= 40 && l.length <= 46));
  if (td3Lines.length >= 2) {
    line1 = td3Lines[0].padEnd(44, '<').substring(0, 44);
    line2 = td3Lines[1].padEnd(44, '<').substring(0, 44);
  } else {
    // Fallback: take first two substantial lines
    line1 = lines[0].padEnd(44, '<').substring(0, 44);
    line2 = lines[1].padEnd(44, '<').substring(0, 44);
  }

  // --- Line 1 Breakdown ---
  // [0..1]: Document type (P, PO, etc.)
  const docType = line1.substring(0, 2).replace(/</g, '').trim() || 'P';
  // [2..4]: Issuing country/org code (3 chars)
  const issuingCountry = line1.substring(2, 5).replace(/</g, '').trim();
  // [5..43]: Name field: SURNAME<<GIVEN<NAMES<<<<
  const nameField = line1.substring(5, 44);
  const nameParts = nameField.split('<<');
  
  const surnameEn = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNamesRaw = (nameParts[1] || '').replace(/</g, ' ').trim();
  const givenNameTokens = givenNamesRaw.split(/\s+/).filter(Boolean);

  // Split into 4 segments as required by Enjaz
  const firstNameEn = givenNameTokens[0] || '';
  const fatherNameEn = givenNameTokens[1] || '';
  const grandFatherNameEn = givenNameTokens[2] || '';
  // Any extra names go with grandfather or surname
  const remainingGiven = givenNameTokens.slice(3).join(' ');
  const familyNameEn = surnameEn || remainingGiven;

  // Transliterate to Arabic helpers
  const firstNameAr = transliterateNameToAr(firstNameEn);
  const fatherNameAr = transliterateNameToAr(fatherNameEn);
  const grandFatherNameAr = transliterateNameToAr(grandFatherNameEn);
  const familyNameAr = transliterateNameToAr(familyNameEn);

  // --- Line 2 Breakdown ---
  // [0..8]: Passport number (9 chars)
  const passportNumber = line2.substring(0, 9).replace(/</g, '').trim();
  const passportCheck = line2.substring(9, 10);
  const validPassCheck = calculateIcaoCheckDigit(line2.substring(0, 9)) === passportCheck;

  // [10..12]: Nationality country code (3 chars)
  const nationalityCode = line2.substring(10, 13).replace(/</g, '').trim();

  // [13..18]: Date of birth (YYMMDD)
  const dobRaw = line2.substring(13, 19);
  const dobCheck = line2.substring(19, 20);
  const validDobCheck = calculateIcaoCheckDigit(dobRaw) === dobCheck;
  const dob = parseDateYYMMDD(dobRaw, true);
  const dobHijri = gregorianToHijri(dob.year, dob.month, dob.day);

  // [20]: Sex (M, F, X, or <)
  const sexChar = line2.substring(20, 21);
  let sex = 'ذكر';
  let sexEn = 'Male';
  let sexCode = 'M';
  if (sexChar === 'F') {
    sex = 'أنثى';
    sexEn = 'Female';
    sexCode = 'F';
  }

  // [21..26]: Date of expiry (YYMMDD)
  const doeRaw = line2.substring(21, 27);
  const doeCheck = line2.substring(27, 28);
  const validDoeCheck = calculateIcaoCheckDigit(doeRaw) === doeCheck;
  const doe = parseDateYYMMDD(doeRaw, false);
  const doeHijri = gregorianToHijri(doe.year, doe.month, doe.day);

  // [28..41]: Optional personal number / national ID
  const personalNumber = line2.substring(28, 42).replace(/</g, '').trim();
  const personalCheck = line2.substring(42, 43);

  // Country Information from DB
  const natInfo = getCountryByCode(nationalityCode) || {
    nameAr: nationalityCode,
    natAr: nationalityCode,
    nameEn: nationalityCode,
    natEn: nationalityCode
  };

  const issuingInfo = getCountryByCode(issuingCountry) || natInfo;

  return {
    rawLines: [line1, line2],
    docType,
    passportNumber,
    passportValid: validPassCheck,
    nationalityCode,
    nationalityAr: natInfo.natAr,
    nationalityEn: natInfo.natEn,
    issuingCountry,
    issuingCountryAr: issuingInfo.nameAr,
    issuingCountryEn: issuingInfo.nameEn,
    // Names (Enjaz Quad-Split)
    firstNameEn,
    fatherNameEn,
    grandFatherNameEn,
    familyNameEn,
    fullNameEn: [firstNameEn, fatherNameEn, grandFatherNameEn, familyNameEn].filter(Boolean).join(' '),
    // Arabic Names
    firstNameAr,
    fatherNameAr,
    grandFatherNameAr,
    familyNameAr,
    fullNameAr: [firstNameAr, fatherNameAr, grandFatherNameAr, familyNameAr].filter(Boolean).join(' '),
    // Dates
    dob,
    dobHijri,
    validDobCheck,
    doe,
    doeHijri,
    validDoeCheck,
    // Gender
    sex,
    sexEn,
    sexCode,
    // IDs
    personalNumber
  };
}
