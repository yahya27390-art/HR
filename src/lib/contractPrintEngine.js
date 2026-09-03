import { SAUDI_INTERNAL_CONTRACT_TERMS } from './contractsEngine';
import { getCompanyProfile } from './companyProfile';

/**
 * Generates official A4 HTML for Saudi Unified Employment Contract
 */
export function generateContractHtml(contract, company = null) {
  const comp = company || getCompanyProfile();
  const isQiwa = contract.category === 'qiwa';
  const isSigned = Boolean(contract.signed_by_employee);
  const dateGregorian = new Date().toLocaleDateString('en-GB');

  const signedDateAr = contract.signed_at 
    ? new Date(contract.signed_at).toLocaleString('ar-SA')
    : 'بانتظار التوقيع';

  const basicSalary = Number(contract.basic_salary || 0);
  const housing = Number(contract.housing_allowance || 0);
  const transport = Number(contract.transport_allowance || 0);
  const totalSalary = Number(contract.total_salary || (basicSalary + housing + transport) || 0);

  const contractNumber = contract.qiwa_contract_number || contract.contract_number || `CNT-DORAT-${contract.employee_number || '1001'}`;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>عقد عمل - ${contract.employee_name || 'موظف'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

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
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
      direction: rtl;
      text-align: right;
    }

    .contract-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 0;
    }

    /* ─── HEADER ─── */
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #0B1F3A;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .header-right {
      text-align: right;
      vertical-align: top;
      width: 38%;
    }

    .header-center {
      text-align: center;
      vertical-align: middle;
      width: 24%;
    }

    .header-left {
      text-align: left;
      vertical-align: top;
      width: 38%;
      direction: ltr;
    }

    .company-title-ar {
      font-size: 13.5px;
      font-weight: 900;
      color: #0B1F3A;
      line-height: 1.2;
    }

    .company-sub-ar {
      font-size: 9.5px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }

    .meta-text {
      font-size: 8.5px;
      color: #334155;
      font-family: 'Cairo', monospace;
      margin-top: 2px;
    }

    .logo-box {
      width: 58px;
      height: 58px;
      border: 1.5px solid #047857;
      border-radius: 12px;
      margin: 0 auto 4px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0fdf4;
      overflow: hidden;
    }

    .logo-box img {
      max-width: 48px;
      max-height: 48px;
      object-fit: contain;
    }

    .logo-text {
      font-size: 15px;
      font-weight: 900;
      color: #047857;
      letter-spacing: 1px;
    }

    .doc-badge {
      display: inline-block;
      background: #0B1F3A;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 5px;
      border: 1px solid #047857;
    }

    /* ─── MAIN TITLE ─── */
    .title-banner {
      background: #f8fafc;
      border: 1.5px solid #0B1F3A;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
      text-align: center;
    }

    .main-title {
      font-size: 13px;
      font-weight: 900;
      color: #0B1F3A;
      letter-spacing: -0.2px;
    }

    .sub-title {
      font-size: 8.5px;
      font-weight: 700;
      color: #047857;
      margin-top: 1px;
    }

    /* ─── METADATA TABLE ─── */
    .section-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #0B1F3A;
      background: #f1f5f9;
      padding: 3.5px 7px;
      border-right: 4px solid #047857;
      margin-bottom: 5px;
      border-radius: 3px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9.5px;
    }

    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      vertical-align: middle;
    }

    .data-table th {
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      width: 18%;
    }

    .data-table td {
      color: #0f172a;
      font-weight: 600;
      width: 32%;
    }

    .highlight-val {
      font-weight: 800;
      color: #047857;
    }

    .salary-highlight {
      font-size: 11px;
      font-weight: 900;
      color: #047857;
    }

    /* ─── ARTICLES / CLAUSES ─── */
    .articles-container {
      margin-bottom: 10px;
    }

    .article-box {
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 5px 8px;
      margin-bottom: 5px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .article-box.highlight {
      border: 1.5px solid #dc2626;
      background: #fffafb;
    }

    .article-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .article-number {
      font-size: 10px;
      font-weight: 800;
      color: #0B1F3A;
    }

    .article-tag {
      font-size: 8px;
      font-weight: 800;
      background: #fee2e2;
      color: #b91c1c;
      padding: 1px 5px;
      border-radius: 4px;
      border: 0.5px solid #f87171;
    }

    .article-content {
      font-size: 9px;
      color: #334155;
      line-height: 1.45;
      text-align: justify;
      white-space: pre-line;
    }

    /* ─── SIGNATURES ─── */
    .signatures-section {
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
      border-top: 2px solid #0B1F3A;
      padding-top: 8px;
    }

    .signatures-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
    }

    .sig-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding: 0 5px;
    }

    .sig-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8fafc;
      min-height: 105px;
      position: relative;
    }

    .sig-title {
      font-size: 10px;
      font-weight: 800;
      color: #0B1F3A;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }

    .sig-info {
      font-size: 9px;
      color: #334155;
      margin-bottom: 2px;
    }

    .seal-badge {
      display: inline-block;
      margin-top: 6px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 3px 6px;
      border-radius: 5px;
      font-size: 8.5px;
      font-weight: 800;
    }

    .sig-pending {
      display: inline-block;
      margin-top: 6px;
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 3px 6px;
      border-radius: 5px;
      font-size: 8.5px;
      font-weight: 700;
    }

    /* ─── FOOTER ─── */
    .contract-footer {
      margin-top: 10px;
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #64748b;
      font-family: 'Cairo', monospace;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="contract-container">
    
    <!-- 1. OFFICIAL CORPORATE LETTERHEAD -->
    <table class="header-table">
      <tr>
        <td class="header-right">
          <div class="company-title-ar">${comp.name_ar || 'شركة درة السيارة لقطع غيار السيارات'}</div>
          <div class="company-sub-ar">إدارة الموارد البشرية والشؤون القانونية</div>
          <div class="meta-text">سجل تجاري: <strong>${comp.cr_number || '7016475555'}</strong></div>
          <div class="meta-text">الرقم الضريبي: <strong>${comp.tax_number || '311861381500003'}</strong></div>
          <div class="meta-text">القصيم - بريدة - المملكة العربية السعودية</div>
        </td>

        <td class="header-center">
          <div class="logo-box">
            ${comp.logo_url 
              ? `<img src="${comp.logo_url}" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="logo-text" style="display:none;">DORAT</span>`
              : `<span class="logo-text">DORAT</span>`
            }
          </div>
          <div class="doc-badge">${isQiwa ? 'عقد منصة قوى موثق' : 'عقد عمل داخلي موحد'}</div>
        </td>

        <td class="header-left">
          <div style="font-size: 10px; font-weight: 900; color: #0B1F3A;">KINGDOM OF SAUDI ARABIA</div>
          <div style="font-size: 8.5px; color: #475569; font-weight: 700;">DORAT AL-SAYARAH TRADING CO.</div>
          <div style="font-size: 8px; color: #334155; margin-top: 2px; font-family: monospace;">Ref: <strong>${contractNumber}</strong></div>
          <div style="font-size: 8px; color: #334155; font-family: monospace;">Date: <strong>${dateGregorian}</strong></div>
          <div style="font-size: 8px; color: #047857; font-weight: 800; margin-top: 1px;">STATUS: ${isSigned ? 'AUTHENTICATED ✓' : 'PENDING SIGNATURE'}</div>
        </td>
      </tr>
    </table>

    <!-- 2. DOCUMENT MAIN BANNER -->
    <div class="title-banner">
      <div class="main-title">عقد عمل موحد وموثق إلكترونياً</div>
      <div class="sub-title">صادر وفقاً لأحكام نظام العمل الصادر بالمرسوم الملكي رقم (م/51) ولائحته التنفيذية بالمملكة العربية السعودية</div>
    </div>

    <!-- 3. CONTRACT METADATA MATRIX -->
    <div class="section-title">أولاً: بيانات طرفي العقد والشروط الوظيفية والمالية</div>
    
    <table class="data-table">
      <tr>
        <th>الطرف الأول (صاحب العمل):</th>
        <td>شركة درة السيارة لقطع غيار السيارات (س.ت: ${comp.cr_number || '7016475555'})</td>
        <th>الممثل النظامي:</th>
        <td>فهد ناصر محمد الجوعي (المدير العام)</td>
      </tr>
      <tr>
        <th>الطرف الثاني (العامل):</th>
        <td class="highlight-val">${contract.employee_name}</td>
        <th>الرقم الوظيفي:</th>
        <td><strong style="font-family: monospace; color: #0B1F3A;">${contract.employee_number}</strong></td>
      </tr>
      <tr>
        <th>رقم الهوية / الإقامة:</th>
        <td><strong style="font-family: monospace;">${contract.national_id || '—'}</strong></td>
        <th>الجنسية:</th>
        <td>${contract.nationality || 'سعودي'}</td>
      </tr>
      <tr>
        <th>المسمى الوظيفي:</th>
        <td><strong>${contract.job_title || 'موظف'}</strong></td>
        <th>فرع ومقر العمل:</th>
        <td>${contract.branch || contract.department || 'الفرع الرئيسي'}</td>
      </tr>
      <tr>
        <th>الراتب الأساسي:</th>
        <td>${basicSalary.toLocaleString('en-US')} ر.س</td>
        <th>بدل السكن والمواصلات:</th>
        <td>${(housing + transport).toLocaleString('en-US')} ر.س</td>
      </tr>
      <tr>
        <th>إجمالي الأجر الشهري:</th>
        <td class="salary-highlight">${totalSalary.toLocaleString('en-US')} ريال سعودي</td>
        <th>طريقة صرف الراتب:</th>
        <td>تحويل بنكي رسمي معتمد (نظام حماية الأجور WPS)</td>
      </tr>
      <tr>
        <th>تاريخ المباشرة وبدء العقد:</th>
        <td><strong style="font-family: monospace;">${contract.start_date || '2026-01-01'}</strong></td>
        <th>تاريخ انتهاء المدة الأولى:</th>
        <td><strong style="font-family: monospace;">${contract.end_date || 'تجديد سنوي تلقائي'}</strong></td>
      </tr>
      <tr>
        <th>مدة العقد:</th>
        <td>سنة ميلادية كاملة (تجدد تلقائياً لمدد مماثلة)</td>
        <th>فترة التجربة القانونية:</th>
        <td>(90) تسعون يوماً من تاريخ المباشرة</td>
      </tr>
      <tr>
        <th>مهلة الإشعار عند إنهاء العقد:</th>
        <td colspan="3"><strong style="color: #b91c1c;">(30) يوماً كاملة (شهر على الأقل) بإشعار كتابي رسمي يعتمده المدير العام</strong></td>
      </tr>
    </table>

    <!-- 4. CONTRACT LEGAL ARTICLES -->
    <div class="section-title">ثانياً: بنود وأحكام العقد واللائحة التنظيمية (10 مواد ملزمة)</div>

    <div class="articles-container">
      ${SAUDI_INTERNAL_CONTRACT_TERMS.map((term) => `
        <div class="article-box ${term.highlight ? 'highlight' : ''}">
          <div class="article-header">
            <span class="article-number">${term.article}</span>
            ${term.highlight ? '<span class="article-tag">شرط إلزامي وجزاء صارم ⚠️</span>' : ''}
          </div>
          <div class="article-content">${term.content}</div>
        </div>
      `).join('')}
    </div>

    <!-- 5. SIGNATURES & OFFICIAL SEALS -->
    <div class="signatures-section">
      <div class="section-title">ثالثاً: الإقرار والمصادقة والتوثيق الرقمي (Digital Seals & Signatures)</div>
      
      <div class="signatures-grid">
        <!-- Employer -->
        <div class="sig-col">
          <div class="sig-card">
            <div class="sig-title">الطرف الأول (صاحب العمل / المنشأة)</div>
            <div class="sig-info"><strong>المنشأة:</strong> شركة درة السيارة لقطع غيار السيارات</div>
            <div class="sig-info"><strong>المفوض بالتوقيع:</strong> فهد ناصر محمد الجوعي</div>
            <div class="sig-info"><strong>الصفة:</strong> المدير العام</div>
            <div class="seal-badge">✓ معتمد ومختوم بالختم الإلكتروني للمنشأة</div>
            <div class="meta-text" style="margin-top: 3px;">SEAL-VERIFIED: DORAT-CARS-7016475555</div>
          </div>
        </div>

        <!-- Employee -->
        <div class="sig-col">
          <div class="sig-card">
            <div class="sig-title">الطرف الثاني (الموظف / العامل)</div>
            <div class="sig-info"><strong>الاسم:</strong> ${contract.employee_name}</div>
            <div class="sig-info"><strong>الرقم الوظيفي:</strong> ${contract.employee_number}</div>
            
            ${isSigned ? `
              <div class="seal-badge">
                ${contract.signed_method === 'qiwa_document_upload' ? '✓ تم رفع وتوثيق عقد قوى الرسمي' : '✓ تم التوقيع والموافقة الإلكترونية بنجاح'}
              </div>
              <div class="sig-info" style="margin-top: 2px; font-size: 8px;">تاريخ الاعتماد: ${signedDateAr}</div>
              <div class="meta-text">رمز التوثيق: ${contract.signature_verification_code || `DIGI-VER-${contract.employee_number}-OK`}</div>
            ` : `
              <div class="sig-pending">
                ⏳ بانتظار توقيع الموظف أو رفع نسخة منصة قوى
              </div>
              <div class="sig-info" style="margin-top: 3px; font-size: 8.5px; color: #64748b;">
                توقيع الموظف: ............................................
              </div>
            `}
          </div>
        </div>
      </div>
    </div>

    <!-- 6. DOCUMENT AUDIT FOOTER -->
    <div class="contract-footer">
      <div>وثيقة رسمية صادرة آلياً من نظام إدارة الموارد البشرية • شركة درة السيارة لقطع غيار السيارات</div>
      <div style="direction: ltr;">CR: ${comp.cr_number || '7016475555'} • VAT: ${comp.tax_number || '311861381500003'} • PAGE 1</div>
    </div>

  </div>

</body>
</html>
  `;
}

/**
 * Triggers clean, high-precision A4 printing via an isolated hidden iframe
 */
export function printContractDocument(contract, company = null) {
  if (!contract) return;

  const htmlContent = generateContractHtml(contract, company);

  // Remove existing print iframe if present
  const existingFrame = document.getElementById('contract-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create clean isolated iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'contract-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Trigger print after iframe renders
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Error printing contract iframe:', e);
    }
  }, 400);

  // Cleanup after print dialog closes
  iframe.contentWindow.onafterprint = () => {
    setTimeout(() => {
      iframe.remove();
    }, 1000);
  };
}
