import { getCompanyProfile } from './companyProfile';
import { getEvaluationTier, STANDARD_EVALUATION_CRITERIA, PURCHASING_EVALUATION_CRITERIA } from './evaluationsEngine';

/**
 * Print single employee evaluation report A4 via clean hidden iframe
 */
export function printEvaluationDocument(evaluation, companyProfile = null) {
  if (!evaluation) return;

  const comp = companyProfile || getCompanyProfile();
  const printHtml = generateEvaluationHtml(evaluation, comp);

  const frameId = 'hr-evaluation-print-iframe';
  let printFrame = document.getElementById(frameId);

  if (printFrame) {
    printFrame.parentNode.removeChild(printFrame);
  }

  printFrame = document.createElement('iframe');
  printFrame.id = frameId;
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  printFrame.style.zIndex = '-9999';

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
  const doc = frameDoc.document || frameDoc;

  doc.open();
  doc.write(printHtml);
  doc.close();

  printFrame.onload = () => {
    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    }, 450);
  };
}

/**
 * Generate official A4 HTML for Performance Evaluation Report
 */
export function generateEvaluationHtml(evaluation, comp) {
  const isPurchasing = Boolean(evaluation.has_purchasing_duty);
  const criteriaList = isPurchasing ? PURCHASING_EVALUATION_CRITERIA : STANDARD_EVALUATION_CRITERIA;
  const scores = evaluation.scores || {};
  const tier = getEvaluationTier(evaluation.total_score);

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير تقييم الأداء - ${evaluation.employee_name} - ${evaluation.month}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      text-align: right;
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.5;
    }

    .report-wrapper {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      border: 2px solid #047857;
      border-radius: 12px;
      padding: 14px 18px;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #047857;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .header-table td {
      vertical-align: middle;
    }

    .company-title {
      font-size: 15px;
      font-weight: 900;
      color: #0B1F3A;
    }

    .company-sub {
      font-size: 9.5px;
      color: #475569;
      font-weight: 700;
    }

    .meta-text {
      font-size: 9px;
      color: #334155;
    }

    .logo-box {
      width: 65px;
      height: 65px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-box img {
      max-width: 65px;
      max-height: 65px;
      object-fit: contain;
    }

    .title-banner {
      background: linear-gradient(135deg, #0B1F3A 0%, #047857 100%);
      color: #ffffff;
      text-align: center;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .title-banner h1 {
      font-size: 15px;
      font-weight: 900;
    }

    .title-banner p {
      font-size: 9px;
      opacity: 0.9;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10.5px;
    }

    .info-table th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-weight: 800;
      color: #0f172a;
      width: 18%;
    }

    .info-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      color: #1e293b;
      width: 32%;
    }

    .section-title {
      font-size: 11.5px;
      font-weight: 900;
      color: #047857;
      border-bottom: 1.5px solid #047857;
      padding-bottom: 3px;
      margin: 12px 0 6px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .criteria-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10px;
    }

    .criteria-table th {
      background: #0B1F3A;
      color: #ffffff;
      border: 1px solid #0B1F3A;
      padding: 6px 8px;
      font-weight: 800;
      text-align: center;
    }

    .criteria-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: middle;
    }

    .criteria-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .score-badge {
      font-weight: 900;
      font-size: 11px;
      color: #047857;
      text-align: center;
    }

    .total-score-card {
      background: #f0fdf4;
      border: 2px solid #047857;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .total-score-val {
      font-size: 22px;
      font-weight: 900;
      color: #047857;
      font-family: monospace;
    }

    .grade-badge {
      background: #047857;
      color: #ffffff;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
    }

    .notes-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 9.5px;
    }

    .notes-box strong {
      color: #0B1F3A;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }

    .signatures-table td {
      width: 50%;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      vertical-align: top;
      background: #ffffff;
    }

    .sig-title {
      font-weight: 800;
      color: #0B1F3A;
      font-size: 10.5px;
      margin-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }

    .footer-text {
      text-align: center;
      font-size: 8px;
      color: #64748b;
      margin-top: 10px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
    }
  </style>
</head>
<body>

  <div class="report-wrapper">
    
    <!-- 1. OFFICIAL LETTERHEAD -->
    <table class="header-table">
      <tr>
        <td style="width: 40%;">
          <div class="company-title">${comp.name_ar || 'شركة درة السيارة لقطع غيار السيارات'}</div>
          <div class="company-sub">إدارة الموارد البشرية والتقييم المؤسسي</div>
          <div class="meta-text">سجل تجاري: <strong>${comp.cr_number || '7016475555'}</strong></div>
          <div class="meta-text">الرقم الضريبي: <strong>${comp.tax_number || '311861381500003'}</strong></div>
          <div class="meta-text">القصيم - بريدة - المملكة العربية السعودية</div>
        </td>

        <td style="width: 20%; text-align: center;">
          <div class="logo-box">
            <img src="${comp.logo_url || '/company-logo.svg'}" alt="Logo" onerror="this.style.display='none';">
          </div>
        </td>

        <td style="width: 40%; text-align: left; direction: ltr;">
          <div style="font-size: 10px; font-weight: 900; color: #0B1F3A;">KINGDOM OF SAUDI ARABIA</div>
          <div style="font-size: 8.5px; color: #475569; font-weight: 700;">DORAT AL-SAYARAH TRADING CO.</div>
          <div style="font-size: 8px; color: #334155; margin-top: 2px;">Ref: <strong>EVAL-${evaluation.month}-${evaluation.employee_number}</strong></div>
          <div style="font-size: 8px; color: #047857; font-weight: 800;">STATUS: APPROVED & VERIFIED ✓</div>
        </td>
      </tr>
    </table>

    <!-- 2. DOCUMENT TITLE -->
    <div class="title-banner">
      <h1>تقرير تقييم الأداء الوظيفي ومؤشرات الإنجاز (Monthly KPI Report)</h1>
      <p>معتمد وفقاً للائحة الحوافز والتقييم الدوري لشركة درة السيارة لقطع غيار السيارات</p>
    </div>

    <!-- 3. EMPLOYEE & EVALUATION DETAILS -->
    <table class="info-table">
      <tr>
        <th>اسم الموظف:</th>
        <td><strong>${evaluation.employee_name}</strong></td>
        <th>الرقم الوظيفي:</th>
        <td><strong style="font-family: monospace;">${evaluation.employee_number}</strong></td>
      </tr>
      <tr>
        <th>المسمى الوظيفي:</th>
        <td>${evaluation.job_title || 'موظف'}</td>
        <th>الفرع والقسم:</th>
        <td>${evaluation.branch || 'الفرع الرئيسي'}</td>
      </tr>
      <tr>
        <th>فترة التقييم (الشهر):</th>
        <td><strong style="color: #047857;">شهر ${evaluation.month}</strong></td>
        <th>فئة التقييم:</th>
        <td>${isPurchasing ? 'كادر المشتريات والمهام الإضافية ⭐' : 'الكادر التشغيلي والمبيعات'}</td>
      </tr>
    </table>

    <!-- 4. DETAILED WEIGHTED CRITERIA TABLE -->
    <div class="section-title">
      <span>تفصيل معايير التقييم والأوزان المئوية (Weighted KPI Matrix):</span>
      <span style="font-size: 9.5px; color: #475569;">إجمالي الأوزان: 100%</span>
    </div>

    <table class="criteria-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="text-align: right; width: 35%;">معيار التقييم</th>
          <th style="text-align: right; width: 35%;">الوصف والهدف</th>
          <th style="width: 12%;">الوزن النسبي</th>
          <th style="width: 13%;">الدرجة المحققة</th>
        </tr>
      </thead>
      <tbody>
        ${criteriaList.map((c, idx) => {
          const rawScore = Number(scores[c.id]) || 0;
          return `
            <tr>
              <td style="text-align: center; font-weight: 800;">${idx + 1}</td>
              <td><strong>${c.name}</strong> ${c.isPurchasingSpecial ? '<span style="color: #b91c1c; font-size: 8px;">(مهمة إضافية)</span>' : ''}</td>
              <td style="color: #475569; font-size: 9px;">${c.desc}</td>
              <td style="text-align: center; font-weight: 800; color: #0B1F3A;">${c.weight}%</td>
              <td class="score-badge">${rawScore} / 100</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- 5. FINAL SCORE & TIER SUMMARY -->
    <div class="total-score-card">
      <div>
        <div style="font-size: 11px; color: #0f172a; font-weight: 800;">النتيجة الإجمالية المرجحة لشهر (${evaluation.month}):</div>
        <div style="font-size: 9px; color: #475569; margin-top: 2px;">${tier.description}</div>
      </div>
      <div style="text-align: left; display: flex; align-items: center; gap: 10px;">
        <div class="total-score-val">${evaluation.total_score}%</div>
        <div class="grade-badge">${tier.grade}</div>
      </div>
    </div>

    <!-- 6. MANAGEMENT NOTES & RECOMMENDATIONS -->
    <div class="notes-box">
      <div><strong>ملاحظات وتوجيهات الإدارة:</strong> ${evaluation.notes || 'أداء طيب ومشهود مع استمرار المتابعة والتطوير.'}</div>
      ${evaluation.strengths ? `<div style="margin-top: 3px;"><strong>أبرز نقاط القوة:</strong> ${evaluation.strengths}</div>` : ''}
      ${evaluation.improvement_areas ? `<div style="margin-top: 3px;"><strong>مجالات التحسين والتطوير:</strong> ${evaluation.improvement_areas}</div>` : ''}
    </div>

    <!-- 7. OFFICIAL SIGNATURES -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="sig-title">المعتمد (المدير العام / صاحب العمل):</div>
          <div><strong>الاسم:</strong> ${evaluation.evaluated_by || 'فهد ناصر محمد الجوعي'}</div>
          <div><strong>الصفة:</strong> المدير العام - شركة درة السيارة لقطع غيار السيارات</div>
          <div style="color: #047857; font-weight: 800; margin-top: 4px; font-size: 9px;">✓ تم الاعتماد والمصادقة بالختم الإلكتروني للمنشأة</div>
        </td>
        <td>
          <div class="sig-title">إقرار واطلاع الموظف:</div>
          <div><strong>الاسم:</strong> ${evaluation.employee_name}</div>
          <div><strong>الرقم الوظيفي:</strong> ${evaluation.employee_number}</div>
          <div style="color: #475569; font-size: 8.5px; margin-top: 4px;">تم إشعار الموظف بنتيجة التقييم عبر نظام الخدمة الذاتية.</div>
        </td>
      </tr>
    </table>

    <div class="footer-text">
      وثيقة رسمية صادرة آلياً من نظام إدارة الموارد البشرية • شركة درة السيارة لقطع غيار السيارات • القصيم - بريدة
    </div>

  </div>

</body>
</html>
  `;
}
