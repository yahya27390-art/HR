import { base44 } from '@/api/base44Client';

const EVALUATIONS_STORAGE_KEY = 'hr_flow_v12_evaluations_store';

// Default Standard Evaluation Criteria for Regular Staff (Total Weight = 100%)
export const STANDARD_EVALUATION_CRITERIA = [
  {
    id: 'attendance_discipline',
    name: 'الحضور والانضباط وعدم الغياب',
    desc: 'الالتزام التام بمواعيد الحضور والانصراف، عدم الغياب بدون عذر، وتجنب التأخير.',
    weight: 15,
    icon: 'Clock',
    color: 'emerald'
  },
  {
    id: 'uniform_appearance',
    name: 'الالتزام بالزي الرسمي والهندام',
    desc: 'ارتداء الزي المعتمد للشركة، بطاقة العمل، ونظافة المظهر العام.',
    weight: 10,
    icon: 'ShieldCheck',
    color: 'blue'
  },
  {
    id: 'job_execution_quality',
    name: 'القيام بالمهام الوظيفية وجودة العمل',
    desc: 'الدقة والسرعة في إنجاز المهام المسندة، تنظيم المستودع وترتيب البضائع.',
    weight: 20,
    icon: 'Briefcase',
    color: 'indigo'
  },
  {
    id: 'whatsapp_customer_care',
    name: 'متابعة العملاء وتنظيم محادثات الواتساب',
    desc: 'سرعة الرد على استفسارات الزبائن، اللباقة في التعامل، ومتابعة الطلبات بدقة.',
    weight: 15,
    icon: 'MessageSquare',
    color: 'teal'
  },
  {
    id: 'google_reviews_reputation',
    name: 'تقييمات جوجل ومراجعات الفرع',
    desc: 'حث العملاء على كتابة تقييمات إيجابية في خرائط جوجل والحرص على رضاهم.',
    weight: 15,
    icon: 'Star',
    color: 'amber'
  },
  {
    id: 'branch_sales_target',
    name: 'تحقيق تارجت ومبيعات الفرع',
    desc: 'المساهمة الفعالة في تحقيق المستهدف البيعي الشهري للفرع وزيادة الإيرادات.',
    weight: 25,
    icon: 'TrendingUp',
    color: 'purple'
  }
];

// Special Evaluation Criteria for Employees with Purchasing & Extra Duties (Total Weight = 100%)
// Applicable to: عبد العزيز الجوعي، صالح المحيميد، خالد الجوعي، أو من يُسند إليه ذلك
export const PURCHASING_EVALUATION_CRITERIA = [
  {
    id: 'attendance_discipline',
    name: 'الحضور والانضباط وعدم الغياب',
    desc: 'الالتزام التام بمواعيد الحضور والانصراف وعدم الغياب.',
    weight: 15,
    icon: 'Clock',
    color: 'emerald'
  },
  {
    id: 'uniform_appearance',
    name: 'الالتزام بالزي الرسمي والهندام',
    desc: 'ارتداء الزي المعتمد والهندام المهني.',
    weight: 10,
    icon: 'ShieldCheck',
    color: 'blue'
  },
  {
    id: 'job_execution_quality',
    name: 'القيام بالمهام الوظيفية الأساسية',
    desc: 'دقة وسرعة إنجاز المهام التشغيلية وجودة الأداء.',
    weight: 15,
    icon: 'Briefcase',
    color: 'indigo'
  },
  {
    id: 'whatsapp_customer_care',
    name: 'متابعة العملاء ومحادثات الواتساب',
    desc: 'سرعة التجاوب والاحترافية في خدمة العملاء.',
    weight: 10,
    icon: 'MessageSquare',
    color: 'teal'
  },
  {
    id: 'google_reviews_reputation',
    name: 'تقييمات جوجل ومراجعات الفرع',
    desc: 'الاهتمام برضا العملاء ورفع تقييم الفرع على خرائط جوجل.',
    weight: 10,
    icon: 'Star',
    color: 'amber'
  },
  {
    id: 'branch_sales_target',
    name: 'تحقيق تارجت ومبيعات الفرع',
    desc: 'المساهمة في تحقيق المستهدف البيعي للفرع.',
    weight: 20,
    icon: 'TrendingUp',
    color: 'purple'
  },
  {
    id: 'branch_purchasing_duties',
    name: 'مشتريات الفرع ومتابعة الموردين (مهمة إضافية)',
    desc: 'سرعة تأمين النواقص وقطع الغيار للفرع، التفاوض بأفضل الأسعار، ودقة التعامل مع الموردين.',
    weight: 20,
    icon: 'ShoppingBag',
    color: 'rose',
    isPurchasingSpecial: true
  }
];

// Special Employee Names with Purchasing Responsibilities
export const PURCHASING_SPECIALISTS_NAMES = [
  'عبدالعزيز الجوعي',
  'عبد العزيز الجوعي',
  'صالح المحيميد',
  'خالد الجوعي'
];

/**
 * Check if employee has special purchasing duties
 */
export function hasPurchasingDuty(employeeName, employeeRole = '') {
  if (!employeeName) return false;
  const cleanName = String(employeeName).trim();
  const isMatch = PURCHASING_SPECIALISTS_NAMES.some(name => cleanName.includes(name) || name.includes(cleanName));
  const isRoleMatch = String(employeeRole).includes('مشتريات') || String(employeeRole).includes('تأمين');
  return isMatch || isRoleMatch;
}

/**
 * Calculate Grade and Tier based on final weighted score (0 - 100)
 */
export function getEvaluationTier(score) {
  const num = Number(score) || 0;
  if (num >= 95) {
    return {
      grade: 'ممتاز مرتفع 🌟',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      description: 'أداء استثنائي فائق — يستحق مكافأة تميز وشهادة شكر',
      color: 'emerald',
      isStar: true
    };
  }
  if (num >= 85) {
    return {
      grade: 'ممتاز',
      badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
      description: 'أداء متميز وتفانٍ كامل في العمل',
      color: 'teal'
    };
  }
  if (num >= 75) {
    return {
      grade: 'جيد جداً',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      description: 'أداء جيد جداً مع التزام ملحوظ بالواجبات',
      color: 'blue'
    };
  }
  if (num >= 65) {
    return {
      grade: 'جيد',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      description: 'أداء مقبول ويلبي الحد الأدنى المطلوب',
      color: 'amber'
    };
  }
  if (num >= 50) {
    return {
      grade: 'مقبول',
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      description: 'يحتاج إلى تحسين ومتابعة في بعض النقاط',
      color: 'orange'
    };
  }
  return {
    grade: 'يحتاج تحسين (لفت نظر)',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    description: 'أداء دون المأمول — يتطلب جلسة توجيه وخطة تصحيحية',
    color: 'rose'
  };
}

/**
 * Calculate overall weighted score from criteria scores map
 */
export function calculateWeightedTotal(criteriaList, scoresMap) {
  let totalScore = 0;
  let totalWeight = 0;

  criteriaList.forEach(c => {
    const rawVal = Number(scoresMap[c.id]) || 0; // value from 0 to 100
    const clampedVal = Math.min(100, Math.max(0, rawVal));
    const weighted = (clampedVal * c.weight) / 100;
    totalScore += weighted;
    totalWeight += c.weight;
  });

  // Normalize to 100% in case weights sum differently
  if (totalWeight > 0 && totalWeight !== 100) {
    totalScore = (totalScore / totalWeight) * 100;
  }

  return Math.round(totalScore * 10) / 10;
}

/**
 * Get all stored evaluations from localStorage
 */
export function getStoredEvaluations() {
  try {
    const raw = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any previous dummy seed items
      return parsed.filter(e => !String(e.id || '').startsWith('eval_seed_'));
    }
    return [];
  } catch (e) {
    console.error('Error reading evaluations store:', e);
    return [];
  }
}

/**
 * Save evaluation record
 */
export function saveEvaluation(evaluationData, evaluatorUser) {
  try {
    const all = getStoredEvaluations();
    const id = evaluationData.id || `eval_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const record = {
      ...evaluationData,
      id,
      evaluated_by: evaluatorUser?.full_name || evaluatorUser?.name || 'فهد ناصر محمد الجوعي (المدير العام)',
      evaluated_at: new Date().toISOString(),
      status: 'approved'
    };

    const existingIdx = all.findIndex(e => e.id === id || (e.employee_number === record.employee_number && e.month === record.month));
    let updated;
    if (existingIdx !== -1) {
      updated = [...all];
      updated[existingIdx] = record;
    } else {
      updated = [record, ...all];
    }

    localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hr_evaluations_updated', { detail: updated }));
    return record;
  } catch (e) {
    console.error('Error saving evaluation:', e);
    return null;
  }
}

/**
 * Delete evaluation record
 */
export function deleteEvaluation(id) {
  try {
    const all = getStoredEvaluations();
    const updated = all.filter(e => e.id !== id);
    localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hr_evaluations_updated', { detail: updated }));
    return true;
  } catch (e) {
    console.error('Error deleting evaluation:', e);
    return false;
  }
}
