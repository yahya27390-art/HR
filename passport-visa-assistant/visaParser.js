/**
 * Saudi Visa Document Parser (محلل ومفرغ مستندات التأشيرات السعودية)
 * Extracts visa number, sponsor CR, company name, requester details, arrival port,
 * entries count, stay duration, and listed visitors from text, OCR output, or PDF text.
 * 100% Local Execution, Zero Cloud
 */

function parseVisaDocumentText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const result = {
    visaNumber: '',
    applicationNumber: '',
    crNumber: '',
    companyName: '',
    requesterName: '',
    requesterIqama: '',
    requesterProfession: '',
    arrivalPort: '',
    visitPurpose: 'زيارة عائلية',
    entriesCount: '',
    stayDuration: '',
    validityPeriod: '365',
    visitors: []
  };

  // 0. الغرض من الزيارة أو نوع التأشيرة
  const purposeMatch = text.match(/(?:نوع\s*التأشيرة|الغرض\s*من\s*الزيارة|سبب\s*الزيارة|غرض\s*الزيارة)[:\s]*([^\n,؛]+)/i);
  if (purposeMatch) {
    result.visitPurpose = purposeMatch[1].trim();
  } else if (text.includes('زيارة عائلية')) {
    result.visitPurpose = 'زيارة عائلية';
  }

  // 1. رقم التأشيرة أو رقم المستند
  const visaNoMatch = text.match(/(?:رقم\s*التأشيرة|رقم\s*المستند|Visa\s*No\.?|Document\s*No\.?|التأشيرة\s*رقم)[:\s]*([0-9]{7,12})/i) ||
                      text.match(/([0-9]{10})/); // 10-digit number common for MOFA visa/doc numbers
  if (visaNoMatch) {
    result.visaNumber = visaNoMatch[1];
  }

  // 2. رقم الطلب
  const appNoMatch = text.match(/(?:رقم\s*الطلب|طلب\s*رقم|Application\s*No\.?)[:\s]*([0-9]{7,12})/i);
  if (appNoMatch) {
    result.applicationNumber = appNoMatch[1];
  }

  // 3. رقم السجل التجاري أو المنشأة (يبدأ بـ 70 للمنشآت أو 10 للسجلات الفردية)
  const crMatch = text.match(/(?:رقم\s*السجل(?:\s*التجاري)?|السجل\s*التجاري|رقم\s*المنشأة|C\.?R\.?\s*No\.?)[:\s]*([0-9]{10})/i) ||
                  text.match(/(?:70\d{8})/);
  if (crMatch) {
    result.crNumber = crMatch[1] || crMatch[0];
  }

  // 4. اسم جهة العمل / صاحب العمل
  const companyMatch = text.match(/(?:اسم\s*جهة\s*العمل|صاحب\s*العمل|المنشأة|الشركة|المؤسسة|Sponsor|Employer)[:\s]*([^\n,؛]+)/i);
  if (companyMatch) {
    result.companyName = companyMatch[1].trim();
  }

  // 5. بيانات المقيم (صاحب الطلب)
  const iqamaMatch = text.match(/(?:رقم\s*الإقامة|رقم\s*هوية\s*المقيم|Iqama\s*No\.?)[:\s]*([12][0-9]{9})/i) ||
                     text.match(/([2][0-9]{9})/); // Saudi resident iqama starts with 2
  if (iqamaMatch) {
    result.requesterIqama = iqamaMatch[1] || iqamaMatch[0];
  }

  const requesterNameMatch = text.match(/(?:اسم\s*(?:صاحب\s*الطلب|المقيم|طالب\s*التأشيرة)|Requester\s*Name)[:\s]*([^\n,؛]+)/i);
  if (requesterNameMatch) {
    result.requesterName = requesterNameMatch[1].trim();
  }

  // 6. جهة القدوم
  const arrivalMatch = text.match(/(?:جهة\s*القدوم|منفذ\s*القدوم|ميناء\s*القدوم|Port\s*of\s*Entry)[:\s]*([^\n,؛]+)/i);
  if (arrivalMatch) {
    result.arrivalPort = arrivalMatch[1].trim();
  } else {
    // Check common ports
    const commonPorts = ['القاهرة', 'الإسكندرية', 'عمان', 'صنعاء', 'بيروت', 'دبي', 'كراتشي', 'إسلام آباد', 'دكا', 'الخرطوم'];
    for (const port of commonPorts) {
      if (text.includes(port)) {
        result.arrivalPort = port;
        break;
      }
    }
  }

  // 7. عدد مرات الدخول (إذا كانت غير محددة أو عليها شرطة '-' لا نكتب فيها أي شيء)
  if (text.includes('عدة سفرات') || text.includes('متعددة') || text.includes('Multiple') || text.includes('عدة رحلات')) {
    result.entriesCount = 'عدة سفرات';
    result.stayDuration = '90';
    result.validityPeriod = '365';
  } else if (text.includes('سفرة واحدة') || text.includes('Single')) {
    result.entriesCount = 'سفرة واحدة';
    result.stayDuration = '30';
    result.validityPeriod = '90';
  } else {
    result.entriesCount = '';
    result.stayDuration = '';
  }

  // 8. مدة الإقامة (فقط إذا كان هناك رقم صريح غير الشرطة)
  const stayMatch = text.match(/(?:مدة\s*الإقامة|الإقامة\s*باليوم|Duration\s*of\s*Stay)[:\s]*([0-9]{1,3})/i);
  if (stayMatch) {
    result.stayDuration = stayMatch[1];
  }

  // 9. استخراج المطلوبين للزيارة المذكورين في نص التأشيرة (أرقام الجوازات والأسماء)
  const passportMatches = text.matchAll(/([A-Z0-9]{6,10})[^\n]*?(?:زوجة|ابن|ابنة|والد|والدة|أخ|أخت)/gi);
  for (const match of passportMatches) {
    result.visitors.push({
      passportNumber: match[1],
      snippet: match[0]
    });
  }

  return result;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseVisaDocumentText = parseVisaDocumentText;
}
if (typeof window !== 'undefined') {
  window.parseVisaDocumentText = parseVisaDocumentText;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseVisaDocumentText };
}
