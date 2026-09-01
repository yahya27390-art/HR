import { cloudSave } from '@/lib/cloudSyncEngine';
import { getCompanyProfile } from '@/lib/companyProfile';

export const REQUEST_TYPES = {
  ANNUAL_LEAVE: {
    id: 'annual_leave',
    label: 'طلب إجازة سنوية',
    icon: 'Palmtree',
    color: 'emerald',
    workflow: ['hr_review', 'approved'],
    impact: 'خصم من رصيد الإجازات السنوية المستحقة'
  },
  UNPAID_LEAVE: {
    id: 'unpaid_leave',
    label: 'طلب إجازة بدون راتب',
    icon: 'CalendarX',
    color: 'rose',
    workflow: ['hr_review', 'owner_approval', 'approved'],
    impact: 'استقطاع مالي مباشر من مسير الراتب لأيام الإجازة'
  },
  ADVANCE: {
    id: 'advance',
    label: 'طلب سلفة مالية',
    icon: 'CreditCard',
    color: 'purple',
    workflow: ['hr_review', 'financial_review', 'owner_approval', 'disbursed'],
    impact: 'جدولة أقساط استقطاع شهري في مسير الرواتب'
  },
  PUNCH_CORRECTION: {
    id: 'punch_correction',
    label: 'طلب تعديل / تصحيح بصمة',
    icon: 'Clock',
    color: 'blue',
    workflow: ['hr_review', 'approved'],
    impact: 'تحديث ساعات العمل الفعلية وإعادة احتساب عجز وتأخير المسير'
  },
  SHIFT_CHANGE: {
    id: 'shift_change',
    label: 'طلب تعديل وردية (شفت)',
    icon: 'RotateCw',
    color: 'indigo',
    workflow: ['hr_review', 'approved'],
    impact: 'تغيير جدول الدوام القياسي بدءاً من تاريخ السريان المحدد'
  },
  SALARY_CERTIFICATE: {
    id: 'salary_certificate',
    label: 'طلب شهادة تعريف بالراتب',
    icon: 'FileText',
    color: 'sky',
    workflow: ['hr_review', 'approved'],
    impact: 'إصدار وتوثيق شهادة رسمية إلكترونية موجهة للبنوك'
  },
  EMPLOYMENT_CERTIFICATE: {
    id: 'employment_certificate',
    label: 'طلب شهادة خبرة / إثبات عمل',
    icon: 'Award',
    color: 'amber',
    workflow: ['hr_review', 'approved'],
    impact: 'إصدار وثيقة إثبات استمرار على رأس العمل'
  },
  UPDATE_PERSONAL_DATA: {
    id: 'update_personal_data',
    label: 'طلب تحديث بيانات شخصية',
    icon: 'User',
    color: 'slate',
    workflow: ['hr_review', 'approved'],
    impact: 'تعديل السجل المدني وبيانات الاتصال في ملف الموظف'
  },
  UPDATE_BANK_DATA: {
    id: 'update_bank_data',
    label: 'طلب تحديث الحساب البنكي (IBAN)',
    icon: 'Building2',
    color: 'teal',
    workflow: ['financial_review', 'owner_approval', 'approved'],
    impact: 'تحديث بيانات الحساب البنكي المعتمد لحماية الأجور (WPS)'
  },
  LEAVE_EXTENSION: {
    id: 'leave_extension',
    label: 'طلب تمديد إجازة',
    icon: 'CalendarPlus',
    color: 'emerald',
    workflow: ['hr_review', 'owner_approval', 'approved'],
    impact: 'إضافة أيام إضافية للإجازة السارية'
  },
  RETURN_FROM_LEAVE: {
    id: 'return_from_leave',
    label: 'إشعار عودة ومباشرة من الإجازة',
    icon: 'UserCheck',
    color: 'green',
    workflow: ['hr_review', 'approved'],
    impact: 'إعادة تفعيل حالة الموظف واستئناف احتساب البصمات اليومية'
  },
  TRANSFER_BRANCH: {
    id: 'transfer_branch',
    label: 'طلب نقل إلى فرع آخر',
    icon: 'MapPin',
    color: 'orange',
    workflow: ['hr_review', 'owner_approval', 'approved'],
    impact: 'تغيير فرع التعيين وجهاز البصمة المعتمد'
  },
  TRANSFER_DEPARTMENT: {
    id: 'transfer_department',
    label: 'طلب نقل إلى قسم آخر',
    icon: 'Briefcase',
    color: 'cyan',
    workflow: ['hr_review', 'owner_approval', 'approved'],
    impact: 'تحديث الهيكل التنظيمي للموظف'
  },
  OTHER: {
    id: 'other',
    label: 'طلب إداري / عام آخر',
    icon: 'HelpCircle',
    color: 'slate',
    workflow: ['hr_review', 'approved'],
    impact: 'مراجعة وتوجيه من إدارة الموارد البشرية'
  }
};

const STORAGE_KEY = 'hr_flow_unified_requests';

export function getUnifiedRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to parse requests:', e);
    return [];
  }
}

export function saveUnifiedRequest(requestData, currentUser) {
  const list = getUnifiedRequests();
  const reqId = requestData.id || ('req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  
  const newRecord = {
    id: reqId,
    request_number: requestData.request_number || ('REQ-' + new Date().getFullYear() + '-' + String(list.length + 1).padStart(4, '0')),
    type: requestData.type || 'other',
    employee_id: requestData.employee_id || currentUser?.id || currentUser?.employee_id || '',
    employee_number: String(requestData.employee_number || currentUser?.employee_number || '').trim(),
    employee_name: requestData.employee_name || currentUser?.full_name || 'موظف',
    branch_name: requestData.branch_name || currentUser?.branch_name || currentUser?.branch || 'الفرع الرئيسي',
    created_at: requestData.created_at || new Date().toISOString(),
    status: requestData.status || 'pending', // 'pending', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'
    current_step: requestData.current_step || 'hr_review',
    details: requestData.details || {},
    reason: requestData.reason || '',
    attachments: requestData.attachments || [],
    financial_impact: requestData.financial_impact || null,
    timeline: requestData.timeline || [
      {
        step: 'submitted',
        title: 'تم تقديم الطلب بنجاح',
        by: currentUser?.full_name || 'الموظف',
        at: new Date().toISOString(),
        note: 'تم إرسال الطلب لإدارة الموارد البشرية للمراجعة والتدقيق.'
      }
    ],
    updated_at: new Date().toISOString(),
    updated_by: currentUser?.full_name || 'المستخدم',
    version: (requestData.version || 1) + 1
  };

  const idx = list.findIndex(r => r.id === newRecord.id);
  if (idx !== -1) {
    list[idx] = newRecord;
  } else {
    list.unshift(newRecord);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  cloudSave(STORAGE_KEY, list);
  window.dispatchEvent(new Event('hr_requests_updated'));
  return newRecord;
}

export function approveRequestStep(requestId, nextStep, currentUser, actionNotes = '') {
  const list = getUnifiedRequests();
  const idx = list.findIndex(r => r.id === requestId);
  if (idx === -1) return null;

  const req = list[idx];
  const isFinal = nextStep === 'approved' || nextStep === 'completed';

  const updated = {
    ...req,
    status: isFinal ? 'approved' : 'under_review',
    current_step: nextStep,
    updated_at: new Date().toISOString(),
    updated_by: currentUser?.full_name || 'المعتمد',
    timeline: [
      ...(req.timeline || []),
      {
        step: nextStep,
        title: isFinal ? 'تم الاعتماد النهائي بنجاح ✓' : `تمت الموافقة والانتقال إلى (${nextStep})`,
        by: currentUser?.full_name || 'المعتمد',
        role: currentUser?.role || 'الإدارة',
        at: new Date().toISOString(),
        note: actionNotes || (isFinal ? 'تمت الموافقة الرسمية على الطلب وتنفيذ أثره في النظام.' : 'تم التدقيق والتمرير للخطوة التالية.')
      }
    ]
  };

  list[idx] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  cloudSave(STORAGE_KEY, list);
  window.dispatchEvent(new Event('hr_requests_updated'));
  return updated;
}

export function rejectRequest(requestId, currentUser, rejectionReason = '') {
  const list = getUnifiedRequests();
  const idx = list.findIndex(r => r.id === requestId);
  if (idx === -1) return null;

  const req = list[idx];
  const updated = {
    ...req,
    status: 'rejected',
    current_step: 'rejected',
    rejection_reason: rejectionReason,
    updated_at: new Date().toISOString(),
    updated_by: currentUser?.full_name || 'المسؤول',
    timeline: [
      ...(req.timeline || []),
      {
        step: 'rejected',
        title: 'تم رفض الطلب ✗',
        by: currentUser?.full_name || 'المسؤول',
        role: currentUser?.role || 'الإدارة',
        at: new Date().toISOString(),
        note: rejectionReason || 'تم رفض الطلب من قبل الإدارة المعنية.'
      }
    ]
  };

  list[idx] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  cloudSave(STORAGE_KEY, list);
  window.dispatchEvent(new Event('hr_requests_updated'));
  return updated;
}
