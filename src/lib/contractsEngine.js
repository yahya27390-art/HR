import { base44 } from '@/api/base44Client';

const CONTRACTS_STORAGE_KEY = 'hr_flow_v12_contracts_store';
const RESIGNATION_NOTICES_KEY = 'hr_flow_v12_resignation_notices';

// Official list of employees whose contracts are documented via Qiwa platform:
// 1. يحيى باشا (1022)
// 2. هشام زغلول (1005)
// 3. محمد سالم (1017)
// 4. محمد عادل (1032)
// 5. خالد الجوعي (1008)
// 6. فهد الجوعي (1001)
// 7. محمود المحيميد (1002)
// 8. عبد الله التويجري (1020)
// 9. صالح المحيميد (1004)
// 10. وضاح العولقي (1013)
// 11. عبد الله ناصر (1033)
export const QIWA_EMPLOYEE_NUMBERS = [
  '1022', // يحيي محمد عبدالغفار باشا (يحيى باشا)
  '1005', // هشام ابوالفضل زغلول (هشام زغلول)
  '1017', // محمد سالم صالح أحمد المردم (محمد سالم)
  '1032', // محمد عادل احمد نعمان (محمد عادل)
  '1008', // خالد ناصر محمد الجوعي (خالد الجوعي)
  '1001', // فهد ناصر محمد الجوعي (فهد الجوعي)
  '1002', // محمود طه المحيميد (محمود المحيميد)
  '1020', // عبد الله يحيى إبراهيم التويجري (عبد الله التويجري)
  '1004', // صالح علي المحيميد (صالح المحيميد)
  '1013', // وضاح صالح سالم أحمد العولقي (وضاح العولقي)
  '1033', // عبد الله ناصر عبد الله محمد عمر (عبد الله ناصر)
];

export function isQiwaContractEmployee(empOrNum) {
  if (!empOrNum) return false;
  const num = typeof empOrNum === 'string' 
    ? empOrNum.replace('emp_', '').trim() 
    : String(empOrNum.employee_number || empOrNum.id || '').replace('emp_', '').trim();
  
  if (QIWA_EMPLOYEE_NUMBERS.includes(num)) return true;

  // Also check name variations if employee_number wasn't available
  const name = typeof empOrNum === 'object' ? (empOrNum.full_name || empOrNum.employee_name || '') : '';
  if (name) {
    if (name.includes('يحيي') || name.includes('يحيى')) return true;
    if (name.includes('زغلول') || name.includes('هشام')) return true;
    if (name.includes('المردم') || (name.includes('محمد') && name.includes('سالم'))) return true;
    if (name.includes('نعمان') || (name.includes('محمد') && name.includes('عادل'))) return true;
    if (name.includes('خالد') && name.includes('الجوعي')) return true;
    if (name.includes('فهد') && name.includes('الجوعي')) return true;
    if (name.includes('محمود') && name.includes('المحيميد')) return true;
    if (name.includes('التويجري') && name.includes('عبد الله')) return true;
    if (name.includes('صالح') && name.includes('المحيميد')) return true;
    if (name.includes('العولقي') || name.includes('وضاح')) return true;
    if (name.includes('عبد الله ناصر') || (name.includes('عبدالله') && name.includes('ناصر'))) return true;
  }

  return false;
}

// Saudi Unified Labor Contract Standard Articles Template (اللائحة التنفيذية لنظام العمل - ملحق رقم 5)
export const SAUDI_INTERNAL_CONTRACT_TERMS = [
  {
    article: 'المادة الأولى: طرفا العقد والصفة التعاقدية ومقر العمل',
    title: 'بيانات الطرفين ومقر العمل',
    content: `يُبرم هذا العقد بين الطرف الأول: شركة درة السيارة لقطع غيار السيارات (سجل تجاري: 7016475555 - الرقم الضريبي / الوطني الموحد: 311861381500003 - المقر الرئيسي: القصيم، بريدة، المملكة العربية السعودية)، ويمثلها المدير العام، وبين الطرف الثاني: الموظف الموضح بياناته ومسماه الوظيفي ورقم هويته/إقامته في صدر هذا العقد. وتعتبر بيانات الطرفين ومقر العمل جزءاً لا يتجزأ من هذا العقد ومفسرة ومكملة له.`
  },
  {
    article: 'المادة الثانية: مدة العقد وسريانه والتجديد (المادتان 37 و 52)',
    title: 'سريان العقد وتجديده',
    content: `يسري هذا العقد لمدة سنة ميلادية واحدة تبدأ من تاريخ مباشرة العمل الفعلي. ويتجدد العقد تلقائياً لمدد مماثلة ما لم يُشعر أحد الطرفين الطرف الآخر كتابة عبر النظام بعدم رغبته في التجديد قبل انتهاء العقد بمدة لا تقل عن (30) يوماً. وتطبيقاً للمادة (37) من نظام العمل والمادة (12) من اللائحة التنفيذية، يُعد عقد عمل غير السعودي محدد المدة دائماً مهما طالت مدته أو تعدد تجديده.`
  },
  {
    article: 'المادة الثالثة: فترة التجربة (المادة 53 من النظام والمادة 19 من اللائحة)',
    title: 'ضوابط فترة التجربة',
    content: `يخضع الطرف الثاني لفترة تجربة محددة بـ (90 يوماً) تبدأ من تاريخ مباشرة العمل، ويجوز تمديدها باتفاق الطرفين كتابة بما لا يتجاوز في مجموعها (180 يوماً). ولا يدخل في حساب فترة التجربة إجازة عيدي الفطر والأضحى، وإجازة اليوم الوطني، وإجازة يوم التأسيس، والإجازة المرضية. ويحق لأي من الطرفين إنهاء العقد خلال فترة التجربة دون إشعار أو مكافأة أو تعويض.`
  },
  {
    article: 'المادة الرابعة: الأجر والبدلات وحماية الأجور (WPS)',
    title: 'الاستحقاقات المالية وطريقة الصرف',
    content: `يلتزم الطرف الأول بدفع الأجر المتفق عليه شهرياً والمفصل إلى (الراتب الأساسي + بدل السكن + بدل النقل + أي بدلات نقدية أخرى) مخصوماً منه اشتراك التأمينات الاجتماعية (GOSI). ويتم إيداع صافي الراتب في الحساب البنكي المعتمد للطرف الثاني (IBAN) عبر نظام حماية الأجور (WPS) المعتمد في المملكة بنهاية كل شهر ميلادي.`
  },
  {
    article: 'المادة الخامسة: ساعات العمل والراحة الأسبوعية والعمل الإضافي (المادة 98 و 107)',
    title: 'تنظيم أوقات العمل والراحة الأسبوعية',
    content: `تحدد ساعات العمل العادية بـ (8) ساعات يومياً بما لا يتجاوز (48) ساعة أسبوعياً، وتخفض إلى (6) ساعات يومياً أو (36) ساعة أسبوعياً خلال شهر رمضان المبارك للمسلمين، مع يوم راحة أسبوعية مدفوعة الأجر. وتعد أي ساعات عمل إضافية بتكليف رسمي خاضعة لأجر الساعة مضافاً إليه (50%) من الأجر الأساسي وفق المادة (107) من نظام العمل، أو احتساب أيام إجازة تعويضية وفق المادة (22 مكرر) من اللائحة التنفيذية.`
  },
  {
    article: 'المادة السادسة: الإجازات السنوية والمناسبات الرسمية (المادة 109 والمادة 40)',
    title: 'الإجازات السنوية والمناسبات المقررة نظاماً',
    content: `يستحق الطرف الثاني إجازة سنوية مدفوعة الأجر مقدماً مدتها (21) يوماً عن كل سنة، تزاد إلى (30) يوماً إذا بلغت خدمته (5) سنوات متصلة لدى الطرف الأول. كما يستحق إجازات المناسبات الرسمية بأجر كامل: (5) أيام للزواج، (3) أيام عند ولادة مولود، (5) أيام لوفاة الزوج أو الأصول أو الفروع، (3) أيام لوفاة الأخ أو الأخت، وإجازات الأعياد الرسمية (الفطر، الأضحى، اليوم الوطني، ويوم التأسيس). ولا يسقط حق العامل في البدل المالي لرصيد إجازاته المستحقة عند انتهاء الخدمة.`
  },
  {
    article: 'المادة السابعة: التزامات صاحب العمل (الطرف الأول)',
    title: 'التزامات المنشأة والامتثال النظامي',
    content: `يلتزم الطرف الأول بتوفير الرعاية الصحية والتأمين الطبي التعاوني، وتسجيل العامل لدى المؤسسة العامة للتأمينات الاجتماعية وسداد الاشتراكات. وبالنسبة للعامل غير السعودي، يتحمل الطرف الأول رسوم الاستقدام والإقامة ورخصة العمل وتجديدها وتذكرة العودة لموطنه عند انتهاء العقد وفق المادة (40) من النظام، ويمتنع الطرف الأول عن احتجاز جواز سفر العامل أو هويته وفق المادة (6) من اللائحة التنفيذية.`
  },
  {
    article: 'المادة الثامنة: التزامات العامل (الطرف الثاني)',
    title: 'واجبات الموظف وأصول المهنة',
    content: `يلتزم الطرف الثاني بإنجاز العمل الموكل إليه بدقة وأمانة وفقاً لأصول المهنة، والعناية الفائقة بالآلات والأجهزة والسيارات والعهد والمواد المسلمة إليه وإعادتها، وحسن السلوك والأخلاق والالتزام بكافة أنظمة المملكة العربية السعودية ولوائح المنشأة، والخضوع للفحوصات الطبية، وتقديم العون دون مقابل إضافي في حالات الطوارئ والكوارث.`
  },
  {
    article: 'المادة التاسعة: إنهاء العقد والاستقالة ومهلة الإشعار (المواد 74 و 75 و 77)',
    title: 'ضوابط ترك العمل ومهلة الإشعار',
    highlight: true,
    content: `يلتزم الطرفان بأحكام انتهاء العقد وفق المواد (74 و 75 و 77) من نظام العمل. وفي حال رغبة الطرف الثاني في الاستقالة أو إنهاء العلاقة التعاقدية، يلتزم بتقديم إشعار استقالة كتابي رسمي عبر نظام الموارد البشرية بمهلة لا تقل عن (30 يوماً - شهر كامل) ومواصلة العمل وتسليم العهد والمهام حتى اعتماد الإدارة. وفي حال الانقطاع المفاجئ عن العمل دون إشعار يلتزم العامل بالتعويض عن أضرار الإخلال بالعقد.`
  },
  {
    article: 'المادة العاشرة: الفسخ التأديبي دون مكافأة (المادة 80)',
    title: 'حالات الفسخ التأديبي الفوري',
    content: `يحق للطرف الأول فسخ العقد دون مكافأة أو إشعار أو تعويض في الحالات الواردة حصراً في المادة (80) من نظام العمل، ومنها: الاعتداء على صاحب العمل أو الرؤساء، التزوير، الإخلال بالالتزامات الجوهرية، الخسارة المادية الجسيمة مع إبلاغ الجهات خلال 24 ساعة، إفشاء الأسرار، أو الغياب دون سبب مشروع لأكثر من (15) يوماً متصلة بشرط إنذاره كتابة بعد (10) أيام، أو أكثر من (30) يوماً متقطعة خلال السنة العقدية بشرط إنذاره كتابة بعد (20) يوماً.`
  },
  {
    article: 'المادة الحادية عشرة: مكافأة نهاية الخدمة وتصفية الحقوق (المادتان 84 و 85)',
    title: 'تصفية المستحقات ومكافأة نهاية الخدمة',
    content: `يستحق الطرف الثاني عند انتهاء خدمة العقد مكافأة نهاية خدمة تحسب على أساس أجر نصف شهر عن كل سنة من السنوات الخمس الأولى، وأجر شهر كامل عن كل سنة من السنوات التالية، وتصفى حقوقه وفق المادتين (84 و 85) من نظام العمل خلال أسبوع كحد أقصى (أو أسبوعين في حال إنهاء العامل للعقد) وفق البند (11.9) من النموذج الموحد.`
  },
  {
    article: 'المادة الثانية عشرة: السرية وحفظ الأسرار وعدم المنافسة (المادة 83)',
    title: 'السرية المهنية وعدم المنافسة',
    content: `يتعهد الطرف الثاني بالمحافظة التامة على سرية البيانات والأسعار والعملاء وحسابات الشركة وأسرار المهنة طوال فترة عمله وبعد انتهائها، ويتعهد بعدم منافسة الطرف الأول أو العمل لدى أي منافس داخل نطاق عمل المنشأة لمدة سنتين من تاريخ انتهاء العقد عملاً بأحكام المادة (83) من نظام العمل.`
  },
  {
    article: 'المادة الثالثة عشرة: النظام الواجب التطبيق والاختصاص القضائي',
    title: 'المرجعية النظامية والمحاكم العمالية',
    content: `يخضع هذا العقد ويفسر وفقاً لأحكام نظام العمل السعودي ولائحته التنفيذية وقرارات وزارة الموارد البشرية والتنمية الاجتماعية، وتختص المحاكم العمالية في المملكة العربية السعودية حصراً بالنظر في أي نزاع ينشأ بين الطرفين. ويُعمل بالتقويم الميلادي في كل ما يتعلق بمدد العقد ومستحقاته، ويكون النص العربي هو المعتمد دوماً.`
  }
];

// Helper to load contracts store
export function getStoredContracts() {
  try {
    const raw = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading contracts:', e);
  }
  return null;
}

// Helper to save contracts store
export function saveStoredContracts(contracts) {
  try {
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
    window.dispatchEvent(new CustomEvent('hr_contracts_updated', { detail: contracts }));
  } catch (e) {
    console.error('Error saving contracts:', e);
  }
}

// Generate or synchronize standard contracts from employee directory
export async function initializeUnifiedContracts(employeesList = null, forceReset = false) {
  if (!forceReset) {
    const existing = getStoredContracts();
    if (existing && existing.length > 0) {
      // Auto-migrate & synchronize Qiwa classification for all existing contracts
      let modified = false;
      const synced = existing.map(c => {
        const isQiwa = isQiwaContractEmployee(c.employee_number || c.employee_id || c.employee_name);
        const expectedCat = isQiwa ? 'qiwa' : 'internal';
        if (c.category !== expectedCat) {
          modified = true;
          return {
            ...c,
            category: expectedCat,
            contract_type: isQiwa ? 'qiwa_documented' : (c.contract_type || 'limited_auto_renew'),
            notes: isQiwa
              ? (c.qiwa_document_url ? 'تم رفع وتوثيق عقد قوى الرسمي' : 'عقد رسمي موثق عبر منصة قوى - بانتظار رفع ملف العقد من قوى')
              : (c.notes || 'عقد العمل الداخلي الموحد (نظام العمل - ملحق 5)')
          };
        }
        return c;
      });

      if (modified) {
        saveStoredContracts(synced);
      }
      return synced;
    }
  }

  let employees = employeesList;
  if (!employees || employees.length === 0) {
    try {
      employees = await base44.entities.Employee.list();
    } catch (e) {
      employees = [];
    }
  }

  const generated = (employees || []).map(emp => {
    const empNum = String(emp.employee_number || emp.id || '').replace('emp_', '');
    const joinDate = emp.join_date || '2025-01-01';
    
    // Default 1 year contract
    const startDate = joinDate;
    const startObj = new Date(startDate);
    const endObj = new Date(startObj);
    endObj.setFullYear(endObj.getFullYear() + 1);
    const endDate = isNaN(endObj.getTime()) ? '2026-12-31' : endObj.toISOString().split('T')[0];

    const contractNumber = `CNT-DORAT-${empNum}-${startObj.getFullYear() || '2025'}`;
    const isQiwa = isQiwaContractEmployee(emp);

    return {
      id: `contract_${empNum}`,
      contract_number: contractNumber,
      employee_id: emp.id || `emp_${empNum}`,
      employee_number: empNum,
      employee_name: emp.full_name,
      job_title: emp.job_title || 'بائع قطع غيار',
      department: emp.department_name || emp.department || 'الفرع الرئيسي',
      branch: emp.branch_name || emp.branch || 'الفرع الرئيسي',
      nationality: emp.nationality || 'سعودي',
      national_id: emp.national_id || '',
      category: isQiwa ? 'qiwa' : 'internal', // Qiwa platform documented VS Unified Internal contract
      contract_type: isQiwa ? 'qiwa_documented' : 'limited_auto_renew',
      duration_months: 12,
      start_date: startDate,
      end_date: endDate,
      auto_renewal: true,
      notice_period_days: 30,
      penalty_compensation_clause: 'خصم أجر شهر الإشعار أو تعويض يعادل راتب شهرين كاملين عند الإخلال المفاجئ بترك العمل دون إشعار',
      basic_salary: Number(emp.salary) || 1500,
      housing_allowance: Number(emp.housing_allowance) || 0,
      transport_allowance: Number(emp.transport_allowance) || 0,
      total_salary: (Number(emp.salary) || 1500) + (Number(emp.housing_allowance) || 0) + (Number(emp.transport_allowance) || 0),
      payout_method: emp.iban ? 'bank_transfer' : 'cash',
      iban: emp.iban || '',
      bank_name: emp.bank_name || 'مصرف الراجحي',
      shift_name: emp.shift || 'شفت قياسي',
      
      // STRICT ZERO-SIGNATURE INITIALIZATION: No contract is pre-signed!
      signed_by_employee: false,
      signed_at: null,
      signed_by_name: null,
      signature_verification_code: null,
      signed_ip: null,
      signed_method: null, // 'internal_digital_signature' | 'qiwa_document_upload'
      approval_status: 'pending_signature', // 'pending_signature' | 'approved' | 'rejected'
      qiwa_contract_number: isQiwa ? `QW-${empNum}` : null,
      qiwa_document_url: null,
      terms_accepted: false,
      penalty_clause_acknowledged: false,
      
      status: 'active', // 'active' | 'expiring_soon' | 'resigned' | 'terminated'
      notes: isQiwa 
        ? 'عقد رسمي موثق عبر منصة قوى - بانتظار رفع الموظف لنسخة العقد الرسمية' 
        : 'عقد العمل الموحد (نظام العمل السعودي - ملحق 5) - بانتظار توقيع الموظف',
      created_at: new Date().toISOString()
    };
  });

  saveStoredContracts(generated);
  return generated;
}

// Sign and digitally approve Internal Contract by employee
export function signEmployeeContract(contractId, employeeData, additionalData = {}) {
  const contracts = getStoredContracts() || [];
  const idx = contracts.findIndex(c => c.id === contractId || c.contract_number === contractId);

  if (idx === -1) throw new Error('العقد غير موجود');

  const now = new Date().toISOString();
  const empNum = employeeData.employee_number || employeeData.id;
  const verCode = `DIGI-INT-${empNum}-${Date.now().toString(36).toUpperCase()}`;

  contracts[idx] = {
    ...contracts[idx],
    category: 'internal',
    signed_by_employee: true,
    signed_at: now,
    signed_by_name: employeeData.full_name,
    signature_verification_code: verCode,
    signed_ip: additionalData.ip || 'بوابة الموظف الذاتية (تطبيق درة السيارة)',
    signed_method: 'internal_digital_signature',
    approval_status: 'approved',
    terms_accepted: true,
    terms_accepted_at: now,
    penalty_clause_acknowledged: true,
    notes: additionalData.notes || 'تم التوقيع والمصادقة على العقد الداخلي والشروط الجزائية إلكترونياً'
  };

  saveStoredContracts(contracts);

  // Trigger notification event for Admin/Owner Dashboard
  window.dispatchEvent(new CustomEvent('hr_contract_signed', {
    detail: {
      contract: contracts[idx],
      employee_name: employeeData.full_name,
      signed_at: now,
      method: 'internal'
    }
  }));

  return contracts[idx];
}

// Upload & Authenticate Qiwa Contract Document by Employee
export function uploadAndVerifyQiwaContract(contractId, employeeData, { fileDataUrl, qiwaNumber, notes }) {
  const contracts = getStoredContracts() || [];
  const idx = contracts.findIndex(c => c.id === contractId || c.contract_number === contractId);

  if (idx === -1) throw new Error('العقد غير موجود');

  const now = new Date().toISOString();
  const empNum = employeeData.employee_number || employeeData.id;
  const verCode = `QIWA-DOC-${empNum}-${Date.now().toString(36).toUpperCase()}`;

  contracts[idx] = {
    ...contracts[idx],
    category: 'qiwa',
    signed_by_employee: true,
    signed_at: now,
    signed_by_name: employeeData.full_name,
    signature_verification_code: verCode,
    signed_ip: 'منصة قوى (تم الرفع والتوثيق عبر بوابة الموظف)',
    signed_method: 'qiwa_document_upload',
    approval_status: 'approved',
    qiwa_contract_number: qiwaNumber || `QW-KSA-${empNum}`,
    qiwa_document_url: fileDataUrl || null,
    terms_accepted: true,
    terms_accepted_at: now,
    penalty_clause_acknowledged: true,
    notes: notes || 'تم رفع وتوثيق عقد قوى الرسمي المعتمد من قبل الموظف'
  };

  saveStoredContracts(contracts);

  // Trigger notification event for Admin/Owner Dashboard
  window.dispatchEvent(new CustomEvent('hr_contract_signed', {
    detail: {
      contract: contracts[idx],
      employee_name: employeeData.full_name,
      signed_at: now,
      method: 'qiwa'
    }
  }));

  return contracts[idx];
}

// Get single employee contract
export function getEmployeeContract(empIdOrNum) {
  const contracts = getStoredContracts() || [];
  const clean = (v) => String(v || '').replace('emp_', '').trim();
  const target = clean(empIdOrNum);
  return contracts.find(c => clean(c.employee_id) === target || clean(c.employee_number) === target) || null;
}

// Resignation & Non-Renewal Notices Management
export function getStoredResignationNotices() {
  try {
    const raw = localStorage.getItem(RESIGNATION_NOTICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading resignation notices:', e);
  }
  return [];
}

export function saveStoredResignationNotices(notices) {
  try {
    localStorage.setItem(RESIGNATION_NOTICES_KEY, JSON.stringify(notices));
    window.dispatchEvent(new CustomEvent('hr_resignation_notices_updated', { detail: notices }));
  } catch (e) {
    console.error('Error saving resignation notices:', e);
  }
}

// Submit a new resignation / non-renewal notice
export function submitResignationNotice(data, employee) {
  const notices = getStoredResignationNotices();
  const noticeNumber = `NOT-RES-${Date.now().toString(36).toUpperCase()}`;
  
  const today = new Date();
  const minNoticeEnd = new Date(today);
  minNoticeEnd.setDate(minNoticeEnd.getDate() + 30); // 30 days mandatory notice

  const newNotice = {
    id: `notice_${Date.now()}`,
    notice_number: noticeNumber,
    employee_id: employee.id,
    employee_number: employee.employee_number,
    employee_name: employee.full_name,
    job_title: employee.job_title,
    branch_name: employee.branch_name || employee.branch,
    submission_date: today.toISOString().split('T')[0],
    requested_last_working_day: data.requested_last_working_day || minNoticeEnd.toISOString().split('T')[0],
    notice_days_provided: Math.max(30, Number(data.notice_days_provided) || 30),
    type: data.type || 'resignation', // 'resignation' | 'non_renewal'
    reason: data.reason || 'رغبة شخصية في عدم تجديد العقد',
    handover_plan: data.handover_plan || 'تسليم العهدة والمهام لمدير الفرع',
    penalty_terms_read: true,
    status: 'pending_manager_approval', // 'pending_manager_approval' | 'approved' | 'rejected'
    manager_action_at: null,
    manager_notes: '',
    created_at: new Date().toISOString()
  };

  notices.unshift(newNotice);
  saveStoredResignationNotices(notices);

  // Dispatch event for GM / Owner Dashboard
  window.dispatchEvent(new CustomEvent('hr_resignation_submitted', { detail: newNotice }));
  return newNotice;
}

// Process resignation notice (by General Manager)
export function processResignationNotice(noticeId, action, notes = '', managerName = 'المدير العام') {
  const notices = getStoredResignationNotices();
  const idx = notices.findIndex(n => n.id === noticeId || n.notice_number === noticeId);
  if (idx === -1) throw new Error('طلب الإشعار غير موجود');

  notices[idx] = {
    ...notices[idx],
    status: action === 'approve' ? 'approved' : 'rejected',
    manager_action_at: new Date().toISOString(),
    manager_name: managerName,
    manager_notes: notes
  };

  saveStoredResignationNotices(notices);

  // If approved, update contract status
  if (action === 'approve') {
    const contracts = getStoredContracts() || [];
    const cIdx = contracts.findIndex(c => c.employee_id === notices[idx].employee_id || c.employee_number === notices[idx].employee_number);
    if (cIdx !== -1) {
      contracts[cIdx].status = 'resigned';
      contracts[cIdx].resignation_effective_date = notices[idx].requested_last_working_day;
      saveStoredContracts(contracts);
    }
  }

  return notices[idx];
}
