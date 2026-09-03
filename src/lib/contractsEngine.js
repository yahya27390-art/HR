import { base44 } from '@/api/base44Client';

const CONTRACTS_STORAGE_KEY = 'hr_flow_v12_contracts_store';
const RESIGNATION_NOTICES_KEY = 'hr_flow_v12_resignation_notices';

// Default Saudi Internal Contract Standard Articles Template
export const SAUDI_INTERNAL_CONTRACT_TERMS = [
  {
    article: 'المادة الأولى: التمهيد والصفة التعاقدية',
    title: 'طرفا العقد ومقر العمل',
    content: `يُبرم هذا العقد بين (الطرف الأول: شركة درة السيارة لقطع غيار السيارات - سجل تجاري: 7016475555 - الرقم الضريبي: 311861381500003) ومقرها المملكة العربية السعودية، وبين (الطرف الثاني: الموظف الموضح بياناته أعلاه). ويعتبر التمهيد والبيانات الوظيفية جزءاً لا يتجزأ من هذا العقد.`
  },
  {
    article: 'المادة الثانية: مدة العقد والتجديد التلقائي',
    title: 'سريان العقد والتجديد',
    content: `مدة هذا العقد (سنة ميلادية واحدة) تبدأ من تاريخ مباشرة العمل. ويتجدد العقد تلقائياً وبشكل دوري لمدد مماثلة ما لم يُخطر أحد الطرفين الآخر خطياً برغبته في عدم التجديد قبل انتهاء العقد بمدة لا تقل عن (30) يوماً (شهر كامل) ويوافق عليها المدير العام.`
  },
  {
    article: 'المادة الثالثة: فترة التجربة',
    title: 'تقييم الأداء في فترة التجربة',
    content: `يخضع الموظف لفترة تجربة مدتها (90) يوماً تبدأ من تاريخ مباشرته للعمل، ويحق لأي من الطرفين إنهاء العقد خلال هذه الفترة وفقاً لأحكام نظام العمل السعودي ولائحة تنظيم العمل بالشركة.`
  },
  {
    article: 'المادة الرابعة: الأجر والبدلات',
    title: 'الاستحقاقات المالية وطريقة الصرف',
    content: `يلتزم الطرف الأول بدفع الأجر الشهري الإجمالي الموضح في بيانات العقد (شاملاً الراتب الأساسي والبدلات المقرة) في نهاية كل شهر ميلادي وفق نظام حماية الأجور (WPS) المعتمد في المملكة.`
  },
  {
    article: 'المادة الخامسة: ساعات العمل والورديات',
    title: 'ساعات العمل وفترات الراحة',
    content: `يلتزم الطرف الثاني بأداء العمل وفق جدول الورديات وساعات العمل المقررة في فرعه (بما يتوافق مع الأنظمة السعودية)، والالتزام بنظام البصمة الإلكترونية للحضور والانصراف بدقة.`
  },
  {
    article: 'المادة السادسة: الإجازات والعطلات الرسمية',
    title: 'الإجازة السنوية والعطلات',
    content: `يستحق الطرف الثاني إجازة سنوية مدفوعة الأجر وفق سياسة الإجازات المعتمدة، إضافة إلى إجازات الأعياد والمناسبات الرسمية المقررة نظاماً في المملكة العربية السعودية.`
  },
  {
    article: 'المادة السابعة: إنهاء العقد ومهلة الإشعار والاستقالة (إلزامي)',
    title: 'ضوابط ترك العمل ومهلة الإشعار',
    highlight: true,
    content: `لا يحق للموظف ترك العمل أو الانقطاع المفاجئ عنه؛ وفي حال رغبة الموظف في الاستقالة أو إنهاء العلاقة التعاقدية، يلتزم بتقديم إشعار استقالة كتابي رسمي عبر نظام الموارد البشرية قبل موعد ترك العمل بمهلة لا تقل عن (30 يوماً - شهر كامل). ويلتزم الموظف بمواصلة أداء عمله وتسليم العهد والمهام كاملة خلال فترة الإشعار حتى موافقة واعتماد المدير العام.`
  },
  {
    article: 'المادة الثامنة: الشرط الجزائي والتعويض المالي (صارم)',
    title: 'الشرط الجزائي عند الإخلال بمهلة الإشعار أو ترك العمل',
    highlight: true,
    content: `في حال قيام الموظف بترك العمل فجأة أو الانقطاع عنه دون تقديم إشعار الاستقالة المحدد بـ (30 يوماً)، أو ترك العمل أثناء سريان مهلة الإشعار دون موافقة خطية من المدير العام:
1) يترتب عليه جزاء فوري بخصم أجر شهر الإشعار بالكامل من مستحقاته ونهاية خدمته.
2) في حال ترتب أضرار تشغيلية على الشركة، يُلزم الموظف بتعويض الشركة بمبلغ يعادل (راتب شهرين كاملين) من آخر راتب شهري تقاضاه، تعويضاً عن الإخلال بالالتزام العقدي وفق أحكام النظام ولائحة الشركة.`
  },
  {
    article: 'المادة التاسعة: السرية وحماية ممتلكات الشركة وعدم المنافسة',
    title: 'الالتزام بالأمانة والسرية المهنية',
    content: `يتعهد الطرف الثاني بالمحافظة التامة على سرية أعمال الشركة، وبيانات العملاء، والأسعار، والحسابات، وعدم إفشاء أي معلومات سرية سواء أثناء سريان العقد أو بعد انتهائه، كما يتعهد بعدم منافسة الشركة بصورة مباشرة أو غير مباشرة.`
  },
  {
    article: 'المادة العاشرة: القانون الواجب التطبيق والاختصاص القضائي',
    title: 'المرجعية النظامية',
    content: `يخضع هذا العقد ويفسر وفقاً لأحكام نظام العمل الصادر بالمرسوم الملكي في المملكة العربية السعودية ولائحته التنفيذية وقرارات وزارة الموارد البشرية والتنمية الاجتماعية، وتختص المحاكم واللجان العمالية في المملكة بالنظر في أي نزاع ينشأ عنه.`
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

// Generate standard contracts from employee directory (ALL START UNSIGNED BY DEFAULT)
export async function initializeUnifiedContracts(employeesList = null, forceReset = false) {
  if (!forceReset) {
    const existing = getStoredContracts();
    if (existing && existing.length > 0) return existing;
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
      category: 'internal', // Default category: Internal until signed or Qiwa uploaded
      contract_type: 'limited_auto_renew', // 1 year auto renew
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
      qiwa_contract_number: null,
      qiwa_document_url: null,
      terms_accepted: false,
      penalty_clause_acknowledged: false,
      
      status: 'active', // 'active' | 'expiring_soon' | 'resigned' | 'terminated'
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
