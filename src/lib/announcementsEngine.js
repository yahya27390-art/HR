// Corporate Circulars and Executive Announcements Engine for Green Arrow HR (Dorat Cars)

const ANNOUNCEMENTS_STORAGE_KEY = 'hr_flow_v11_live_announcements';

export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'circ_101',
    number: 'CIRC-2026-005',
    title: 'تنظيم مواعيد الدوام الرسمي للورديات وفترة العمل المعتمدة بكافة الفروع',
    content: `بناءً على مقتضيات مصلحة العمل وتنظيم حركة المبيعات وخدمة العملاء في الفروع (الفرع الرئيسي، فرع كيا، فرع هونداي، ومكتب الإدارة)، نؤكد على الالتزام التام بمواعيد الورديات المقرة في النظام وتسجيل البصمات الإلكترونية في أوقات الحضور والانصراف بدقة.\n\nشاكرين ومقدرين حسن التزامكم وتعاونكم.`,
    author_name: 'فهد ناصر محمد الجوعي',
    author_role: 'المدير العام',
    category: 'executive', // 'executive' | 'financial' | 'hr' | 'urgent'
    target: 'all', // 'all' | 'sales' | 'admin' | 'accounting'
    priority: 'high',
    is_pinned: true,
    created_at: '2026-08-30T10:00:00.000Z'
  },
  {
    id: 'circ_102',
    number: 'CIRC-2026-004',
    title: 'اعتماد وإيداع مسير رواتب وبدلات شهر أغسطس 2026 وقسائم الرواتب A4',
    content: `السادة منسوبي منشأة درة السيارة الكرام،\n\nتم بحمد الله اعتماد وتدقيق مسير الرواتب والبدلات لشهر أغسطس 2026 وفق نظام حماية الأجور (WPS). يمكن لجميع الموظفين استعراض وطباعة قسيمة الراتب الرسمية A4 من خلال بوابة الخدمة الذاتية.\n\nمع أطيب التمنيات للجميع بالتوفيق.`,
    author_name: 'هشام ابوالفضل زغلول',
    author_role: 'مدير الحسابات والرواتب',
    category: 'financial',
    target: 'all',
    priority: 'high',
    is_pinned: true,
    created_at: '2026-08-28T14:30:00.000Z'
  },
  {
    id: 'circ_103',
    number: 'CIRC-2026-003',
    title: 'توثيق وتوقيع عقود العمل الإلكترونية لجميع منسوبي المؤسسة',
    content: `تزامناً مع تحديثات المنظومة وتطبيق اللائحة الداخلية المعتمدة، نأمل من جميع الزملاء الدخول إلى بوابة الموظف واستعراض عقد العمل وقراءته والمصادقة عليه إلكترونياً لتوثيق الملفات الإدارية.\n\nإدارة الموارد البشرية.`,
    author_name: 'يحيي محمد عبدالغفار باشا',
    author_role: 'مسؤول الموارد البشرية والتصميم',
    category: 'hr',
    target: 'all',
    priority: 'medium',
    is_pinned: false,
    created_at: '2026-08-25T09:15:00.000Z'
  }
];

// Helper to get all announcements
export function getLiveAnnouncements() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading announcements:', e);
  }
  // Initialize default
  try {
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  } catch {}
  return DEFAULT_ANNOUNCEMENTS;
}

// Helper to save announcements
export function saveLiveAnnouncements(list) {
  try {
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('hr_announcements_updated', { detail: list }));
  } catch (e) {
    console.error('Error saving announcements:', e);
  }
}

// Add new announcement / circular / note
export function addAnnouncement(data, user) {
  const current = getLiveAnnouncements();
  const id = `circ_${Date.now()}`;
  const num = `CIRC-2026-${String(current.length + 1).padStart(3, '0')}`;

  const newAnn = {
    id,
    number: num,
    title: data.title || 'تعميم إداري جديد',
    content: data.content || '',
    author_name: user?.full_name || 'المدير العام',
    author_role: user?.role === 'owner' ? 'المدير العام (فهد الجوعي)' :
                 user?.role === 'accountant' ? 'الإدارة المالية (هشام زغلول)' :
                 user?.role === 'hr' ? 'الموارد البشرية (يحيى باشا)' : 'إدارة المنشأة',
    category: data.category || 'executive', // 'executive' | 'financial' | 'hr' | 'urgent'
    target: data.target || 'all',
    priority: data.priority || 'high',
    is_pinned: Boolean(data.is_pinned),
    created_at: new Date().toISOString()
  };

  const updated = [newAnn, ...current];
  saveLiveAnnouncements(updated);
  return newAnn;
}

// Delete announcement
export function deleteAnnouncement(id) {
  const current = getLiveAnnouncements();
  const updated = current.filter(a => a.id !== id);
  saveLiveAnnouncements(updated);
  return updated;
}
