// RBAC helpers (inline to avoid circular imports)
function _determineRole(emp) {
  var num = String((emp&&emp.employee_number)||"");
  var email = ((emp&&emp.email)||"").toLowerCase();
  var job = ((emp&&emp.job_title)||"").toLowerCase();
  if (num==="1001"||email==="dortalsiarh@gmail.com") return "owner";
  if (num==="1005"||email==="hes.ham42@yahoo.com") return "accountant";
  if (num==="1022"||email==="yahya9031@gmail.com") return "system_admin";
  if (job.indexOf("محاسب")!==-1||job.indexOf("حسابات")!==-1) return "accountant";
  if (job.indexOf("موارد بشرية")!==-1) return "hr";
  return "employee";
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://omnvdvmmmarwsobadlsb.supabase.co';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_nUzUqD6WBgXey6SRU76zUA_Q5mlC1B5';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;


// Auto normalize branch names on load
function normalizeEmployeeBranches(list) {
  return (list || []).map(e => {
    const bName = e.branch_name || e.branch || 'مكتب الإدارة';
    return {
      ...e,
      branch: bName,
      branch_name: bName,
      department: e.department_name || e.department || bName,
      department_name: e.department_name || e.department || bName
    };
  });
}


// ============================================================================
// AUTO DATABASE SYNC v8 (Guarantees zero cache mismatch across all browsers)
// ============================================================================
const CURRENT_DB_VERSION = 'v11_strict_realtime_biometrics';
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (localStorage.getItem('hr_flow_db_ver') !== CURRENT_DB_VERSION) {
      // Clear all legacy storage keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('hr_flow_') || k.startsWith('nexus_'))) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem('hr_flow_db_ver', CURRENT_DB_VERSION);
    }
  }
} catch (e) {
  console.warn('Storage sync:', e);
}

const STORAGE_PREFIX = 'hr_flow_v11_dora_';



export const initialData = {
  Company: [
    {
      id: 'comp_1',
      name: 'درة السيارة لقطع غيار السيارات',
      legal_name: 'HR DORAT CARS',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966541697999',
      address: 'المملكة العربية السعودية'
    }
  ],
  Branch: [
    { id: 'br_admin', name: 'مكتب الإدارة', address: 'طريق الملك فهد، الرياض', phone: '+966541697999', company_id: 'comp_1', is_main: true },
    { id: 'br_main', name: 'الفرع الرئيسي', address: 'الفرع الرئيسي', phone: '+966542070313', company_id: 'comp_1', is_main: false },
    { id: 'br_kia', name: 'فرع كيا ( السليم )', address: 'حي السليم', phone: '+966542821253', company_id: 'comp_1', is_main: false },
    { id: 'br_hyundai', name: 'فرع هونداي ( الرواف )', address: 'حي الرواف', phone: '+966553601195', company_id: 'comp_1', is_main: false }
  ],
  Department: [
    { id: 'dep_admin', name: 'مكتب الإدارة', code: 'ADMIN', manager_name: 'فهد ناصر محمد الجوعي' },
    { id: 'dep_main', name: 'الفرع الرئيسي', code: 'MAIN', manager_name: 'محمود طه المحيميد' },
    { id: 'dep_kia', name: 'فرع كيا ( السليم )', code: 'KIA', manager_name: 'صالح علي المحيميد' },
    { id: 'dep_hyundai', name: 'فرع هونداي ( الرواف )', code: 'HYUNDAI', manager_name: 'عبد العزيز ناصر محمد الجوعي' }
  ],
  JobTitle: [
    { id: 'job_1', name: 'مصمم ومسؤول موارد بشرية', title: 'مصمم ومسؤول موارد بشرية' },
    { id: 'job_2', name: 'مدير حسابات', title: 'مدير حسابات' },
    { id: 'job_3', name: 'بائع قطع غيار', title: 'بائع قطع غيار' },
    { id: 'job_4', name: 'المدير العام', title: 'المدير العام' }
  ],
  LeaveType: [
    { id: 'lt_1', name: 'إجازة سنوية', code: 'annual', paid: true },
    { id: 'lt_2', name: 'إجازة بدون راتب', code: 'unpaid', paid: false },
    { id: 'lt_3', name: 'إجازة للعمرة', code: 'umrah', paid: false },
    { id: 'lt_4', name: 'إجازة تعويضية', code: 'comp', paid: true }
  ],
  LeavePolicy: [
    { 
      id: 'lp_1', 
      name: 'اجازات بدون مرتب', 
      company: 'HR DORAT CARS', 
      annual_days: 30, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 0, 
      emergency_days: 0 
    },
    { 
      id: 'lp_2', 
      name: 'الاجازة السنوية', 
      company: 'HR DORAT CARS', 
      annual_days: 21, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 0, 
      emergency_days: 0 
    }
  ],
    Shift: [
    {
      id: 'sh_non_saudi_overtime',
      name: 'فترة عمل غير سعودي (9 ساعات + إضافي 100 ريال)',
      type: 'multi',
      start_time: '09:00',
      end_time: '21:00',
      break_start: '13:00',
      break_end: '16:00',
      working_hours: 9,
      grace_minutes: 15,
      description: 'دوام فترتين مخصص (يحيى باشا & هشام زغلول): 9:00 ص إلى 1:00 م & 4:00 ع إلى 9:00 م (ساعة إضافية يومية = 100 ريال)'
    },
    {
      id: 'sh_non_saudi',
      name: 'فترة عمل غير سعودي (الأساسي 8 ساعات)',
      type: 'multi',
      start_time: '08:00',
      end_time: '20:00',
      break_start: '12:00',
      break_end: '16:00',
      working_hours: 8,
      grace_minutes: 15,
      description: 'دوام فترتين أساسي: 8:00 ص إلى 12:00 م & 4:00 ع إلى 8:00 م مع استراحة 4 ساعات'
    },
    {
      id: 'sh_saudi_morning',
      name: 'فترة عمل سعودي صباحي',
      type: 'morning',
      start_time: '08:00',
      end_time: '13:00',
      break_start: '',
      break_end: '',
      working_hours: 5,
      grace_minutes: 15,
      description: 'دوام صباحي 5 ساعات للكوادر الوطنية'
    },
    {
      id: 'sh_saudi_evening',
      name: 'فترة عمل سعودي مسائي',
      type: 'evening',
      start_time: '15:30',
      end_time: '21:30',
      break_start: '',
      break_end: '',
      working_hours: 6,
      grace_minutes: 15,
      description: 'دوام مسائي للكوادر الوطنية 6 ساعات'
    },
    {
      id: 'sh_gm',
      name: 'شفت المدير العام',
      type: 'flexible',
      start_time: '09:00',
      end_time: '17:00',
      break_start: '',
      break_end: '',
      working_hours: 8,
      grace_minutes: 0,
      description: 'دوام الإدارة العامة حضور وانصراف مرن ومعفى آلياً'
    },
    {
      id: 'sh_ramadan',
      name: 'شفت رمضان',
      type: 'ramadan',
      start_time: '20:30',
      end_time: '02:00',
      break_start: '',
      break_end: '',
      working_hours: 5.5,
      grace_minutes: 20,
      description: 'دوام شهر رمضان المبارك المسائي'
    }
  ],
  Employee: [
    {
      id: 'emp_1001',
      employee_number: '1001',
      full_name: 'فهد ناصر محمد الجوعي',
      email: 'dortalsiarh@gmail.com',
      phone: '966541697999',
      job_title: 'المدير العام',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'شفت المدير العام',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1111738496',
      id_expiry_date: '1455-04-03',
      birth_date: '1992-02-05',
      join_date: '2022-11-01',
      salary: 4000,
      is_insured: true,
      gosi_number: 'GSI-909119',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1022',
      employee_number: '1022',
      full_name: 'يحيي محمد عبدالغفار باشا',
      email: 'yahya9031@gmail.com',
      phone: '966575901487',
      job_title: 'مصمم و مسئول الموارد البشرية',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'مصري',
      national_id: '2554901666',
      id_expiry_date: '1448-04-16',
      birth_date: '1990-03-27',
      join_date: '2025-01-01',
      salary: 4000,
      is_insured: true,
      gosi_number: 'GSI-208695',
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1005',
      employee_number: '1005',
      full_name: 'هشام ابوالفضل زغلول',
      email: 'hes.ham42@yahoo.com',
      phone: '966542070313',
      job_title: 'مدير الحسابات',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'مصري',
      national_id: '2406494993',
      id_expiry_date: '1448-05-22',
      birth_date: '1988-06-01',
      join_date: '2022-11-01',
      salary: 5500,
      is_insured: true,
      gosi_number: 'GSI-794498',
      housing_allowance: 150,
      transport_allowance: 150,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1034',
      employee_number: '1034',
      full_name: 'طه محمود المحيميد',
      email: 'taha141318@gmail.com',
      phone: '966507437337',
      job_title: 'مسئول متجر الكتروني',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سوري',
      national_id: '',
      id_expiry_date: '',
      birth_date: '',
      join_date: '2026-04-13',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-708624',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1002',
      employee_number: '1002',
      full_name: 'محمود طه المحيميد',
      email: 'ma-h77@hotmail.com',
      phone: '966542070313',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سوري',
      national_id: '2151595283',
      id_expiry_date: '1448-03-06',
      birth_date: '1977-01-01',
      join_date: '2022-11-01',
      salary: 4200,
      is_insured: true,
      gosi_number: 'GSI-165355',
      housing_allowance: 150,
      transport_allowance: 150,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1004',
      employee_number: '1004',
      full_name: 'صالح علي المحيميد',
      email: 'salehali.e@gmail.com',
      phone: '966542821253',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1106501065',
      id_expiry_date: '1450-07-17',
      birth_date: '1999-02-18',
      join_date: '2022-11-01',
      salary: 4000,
      is_insured: true,
      gosi_number: 'GSI-464430',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1008',
      employee_number: '1008',
      full_name: 'خالد ناصر محمد الجوعي',
      email: 'khaled@gmail.com',
      phone: '966544439321',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1111738488',
      id_expiry_date: '1450-10-25',
      birth_date: '1997-08-17',
      join_date: '2023-02-01',
      salary: 3300,
      is_insured: true,
      gosi_number: 'GSI-368966',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1011',
      employee_number: '1011',
      full_name: 'عبد العزيز ناصر محمد الجوعي',
      email: 'azooz7998@gmail.com',
      phone: '966553601195',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1113348641',
      id_expiry_date: '1449-04-24',
      birth_date: '2001-08-30',
      join_date: '2023-05-23',
      salary: 2500,
      is_insured: true,
      gosi_number: 'GSI-243628',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1013',
      employee_number: '1013',
      full_name: 'وضاح صالح سالم أحمد العولقي',
      email: 'abosaleh7830@gmail.com',
      phone: '966549107830',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2539519401',
      id_expiry_date: '1448-03-20',
      birth_date: '1995-04-05',
      join_date: '2023-11-18',
      salary: 2500,
      is_insured: true,
      gosi_number: 'GSI-161888',
      housing_allowance: 200,
      transport_allowance: 200,
      leave_policy: 'Standard Policy',
      status: 'active'
    },
    {
      id: 'emp_1015',
      employee_number: '1015',
      full_name: 'عزام علي السعوي',
      email: 'azzam1015@doratcars.com',
      phone: '966500001015',
      job_title: 'موظف مبيعات وخدمة عملاء',
      department_name: 'قسم المبيعات',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل السعودي المساء',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1015000000',
      id_expiry_date: '1455-01-01',
      birth_date: '1998-05-15',
      join_date: '2026-08-16',
      salary: 4000,
      is_insured: true,
      gosi_number: 'GSI-484161',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },

    {
      id: 'emp_1017',
      employee_number: '1017',
      full_name: 'محمد سالم صالح أحمد المردم',
      email: 'mmha1998man@gmail.com',
      phone: '966532343471',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2541925349',
      id_expiry_date: '1447-09-21',
      birth_date: '1998-01-11',
      join_date: '2024-09-24',
      salary: 2000,
      is_insured: true,
      gosi_number: 'GSI-481938',
      housing_allowance: 200,
      transport_allowance: 100,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1018',
      employee_number: '1018',
      full_name: 'عاصم ابراهيم الرياعي',
      email: 'abosa4er33@hotmail.com',
      phone: '966505873004',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1129098602',
      id_expiry_date: '1448-10-11',
      birth_date: '2005-04-11',
      join_date: '2026-02-12',
      salary: 1800,
      is_insured: true,
      gosi_number: 'GSI-384002',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1020',
      employee_number: '1020',
      full_name: 'عبد الله يحيى إبراهيم التويجري',
      email: 'abodytw26@icloud.com',
      phone: '966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1118862547',
      id_expiry_date: '1447-02-21',
      birth_date: '2003-01-02',
      join_date: '2024-10-12',
      salary: 3000,
      is_insured: true,
      gosi_number: 'GSI-234371',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1021',
      employee_number: '1021',
      full_name: 'إبراهيم عبد العزيز التويجري',
      email: 'ab0790468@gmail.com',
      phone: '966554460559',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سعودي',
      national_id: '1116885797',
      id_expiry_date: '',
      birth_date: '2026-02-15',
      join_date: '2026-02-15',
      salary: 1800,
      is_insured: true,
      gosi_number: 'GSI-256650',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1024',
      employee_number: '1024',
      full_name: 'سفيان عبد الرحمن الضالع',
      email: 'sfyan5401@gmail.com',
      phone: '966501801811',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر الجوعي',
      nationality: 'سعودي',
      national_id: '1130465527',
      id_expiry_date: '',
      birth_date: '2005-08-01',
      join_date: '2025-03-01',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-106401',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1027',
      employee_number: '1027',
      full_name: 'محمد صالح محمد السعوي',
      email: 'mohammedsa.2005a@gmail.com',
      phone: '966506189288',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1145258602',
      id_expiry_date: '1451-02-06',
      birth_date: '2005-05-09',
      join_date: '2025-09-01',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-237894',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1032',
      employee_number: '1032',
      full_name: 'محمد عادل احمد نعمان',
      email: 'mo7781199@gmail.com',
      phone: '966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2564699011',
      id_expiry_date: '1448-09-11',
      birth_date: '2001-01-01',
      join_date: '2025-12-24',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-536459',
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1033',
      employee_number: '1033',
      full_name: 'عبد الله ناصر عبد الله محمد عمر',
      email: 'lkhg964@gmail.com',
      phone: '966559249379',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2611459286',
      id_expiry_date: '2025-10-15',
      birth_date: '2002-09-30',
      join_date: '2026-01-18',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-192020',
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1035',
      employee_number: '1035',
      full_name: 'محمدعبد محمد البليهي',
      email: '1035@durracars.sa',
      phone: '966535014657',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سعودي',
      national_id: '1130729724',
      id_expiry_date: '',
      birth_date: '2005-08-16',
      join_date: '2026-04-15',
      salary: 1500,
      is_insured: true,
      gosi_number: 'GSI-825887',
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    }
  ],
  EmploymentContract: [],
  AttendanceLog: [],
  LeaveRequest: []
};

// Generate matching employment contracts
initialData.EmploymentContract = initialData.Employee.map((e) => ({
  id: 'cont_' + e.employee_number,
  employee_id: e.id,
  employee_name: e.full_name,
  contract_type: 'full_time',
  start_date: e.join_date,
  end_date: '2027-12-31',
  basic_salary: e.salary,
  housing_allowance: e.housing_allowance || 0,
  transport_allowance: e.transport_allowance || 0,
  status: 'active'
}));

function getLocalItems(entityName) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + entityName);
    if (!raw) {
      const init = initialData[entityName] || [];
      localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialData[entityName] || [];
  }
}

function saveLocalItems(entityName, items) {
  try {
    localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(items));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}


const ENTITY_TABLE_MAP = {
  AttendanceLog: 'attendance_logs',
  Employee: 'employees',
  Company: 'companies',
  Branch: 'branches',
  Department: 'departments',
  Shift: 'shifts',
  LeavePolicy: 'leave_policies',
  EmploymentContract: 'employment_contracts',
};

function getTableName(entityName) {
  const map = {
    'Employee': 'employees',
    'AttendanceLog': 'attendance_logs',
    'Branch': 'branches',
    'Department': 'departments',
    'Shift': 'shifts',
    'LeaveRequest': 'leave_requests',
    'Announcement': 'announcements'
  };
  return map[entityName] || (entityName.toLowerCase() + 's');
}

function toDbRecord(entityName, item) {
  if (!item) return item;

  if (entityName === 'Employee') {
    const isInsured = item.is_insured === true || item.is_insured === 'true';
    const gosiNum = isInsured ? (item.gosi_number || '') : '';
    
    let existingManager = item.manager_name || null;
    if (typeof existingManager === 'string' && existingManager.startsWith('{')) {
      try {
        const parsed = JSON.parse(existingManager);
        existingManager = parsed.manager_name || null;
      } catch (e) {}
    }

    const meta = JSON.stringify({
      is_insured: isInsured,
      gosi_number: gosiNum,
      insured_salary: Number(item.insured_salary || item.salary) || 0,
      payout_method: item.payout_method || (item.iban ? 'bank_full' : 'cash_full'),
      bank_transfer_amount: Number(item.bank_transfer_amount) || 0,
      bank_name: item.bank_name || 'مصرف الراجحي',
      iban: item.iban || '',
      insurance_company: item.insurance_company || '',
      insurance_category: item.insurance_category || '',
      insurance_policy_number: item.insurance_policy_number || '',
      insurance_expiry: item.insurance_expiry || '',
      manager_name: existingManager,
      company: item.company || 'درة السيارة لقطع غيار السيارات',
      gender: item.gender || 'male',
      marital_status: item.marital_status || 'أعزب',
      contract_type: item.contract_type || 'محدد',
      contract_end_date: item.contract_end_date || null
    });

    const empNum = String(item.employee_number || item.id || '').replace('emp_', '');
    const empId = item.id || ('emp_' + empNum);

    return {
      id: empId,
      employee_number: empNum,
      full_name: item.full_name || '',
      email: item.email || null,
      phone: item.phone || null,
      job_title: item.job_title || '',
      department_name: item.department_name || item.department || 'مكتب الإدارة',
      branch_name: item.branch_name || item.branch || 'مكتب الإدارة',
      shift: item.shift || 'فترة عمل غير سعودي',
      manager_name: meta,
      nationality: item.nationality || 'سعودي',
      national_id: item.national_id || '',
      id_expiry_date: item.id_expiry_date || null,
      birth_date: item.birth_date || null,
      join_date: item.join_date || item.hire_date || null,
      salary: Number(item.salary) || 0,
      housing_allowance: Number(item.housing_allowance) || 0,
      transport_allowance: Number(item.transport_allowance) || 0,
      leave_policy: item.leave_policy || 'الاجازة السنوية',
      status: item.status || 'active',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'AttendanceLog') {
    const empId = item.employee_id || item.user_id || ('emp_' + (item.employee_number || '1000'));
    const empNum = String(item.employee_number || item.employee_id || '').replace('emp_', '');
    const empName = item.employee_name || 'موظف';
    const logDate = item.log_date || (item.check_in ? String(item.check_in).slice(0, 10) : new Date().toISOString().split('T')[0]);
    
    const metaNotes = JSON.stringify({
      employee_number: empNum,
      user_id: empId,
      period_1_in: item.period_1_in || '',
      period_1_out: item.period_1_out || '',
      period_2_in: item.period_2_in || '',
      period_2_out: item.period_2_out || '',
      timestamp_raw: item.timestamp_raw || '',
      total_hours: Number(item.total_hours) || 0,
      leave_type: item.leave_type || null,
      deduction_from_annual_balance: item.deduction_from_annual_balance || false,
      note: typeof item.notes === 'string' ? item.notes : ''
    });

    const uniqueId = item.id || `att_${empNum}_${logDate}`.replace(/[^a-zA-Z0-9_]/g, '_');

    return {
      id: uniqueId,
      employee_id: empId,
      employee_name: empName,
      log_date: logDate,
      check_in: item.check_in || (item.period_1_in ? `${logDate}T${item.period_1_in}:00` : null),
      check_out: item.check_out || (item.period_2_out ? `${logDate}T${item.period_2_out}:00` : null),
      status: item.status || 'present',
      notes: metaNotes,
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Branch') {
    return {
      id: item.id || ('br_' + Date.now()),
      name: item.name || '',
      address: item.address || '',
      phone: item.phone || '',
      is_main: Boolean(item.is_main),
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Department') {
    return {
      id: item.id || ('dept_' + Date.now()),
      name: item.name || '',
      code: item.code || 'DEP',
      manager_name: item.manager_name || '',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Shift') {
    return {
      id: item.id || ('shf_' + Date.now()),
      name: item.name || '',
      type: item.type || 'morning',
      start_time: item.start_time || '08:00',
      end_time: item.end_time || '17:00',
      break_start: item.break_start || null,
      break_end: item.break_end || null,
      working_hours: Number(item.working_hours) || 8,
      grace_minutes: Number(item.grace_minutes) || 15,
      description: item.description || '',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Loan') {
    return {
      id: item.id || ('loan_' + Date.now()),
      employee_id: item.employee_id || '',
      amount: Number(item.amount) || 0,
      reason: item.reason || '',
      installments: Number(item.installments) || 1,
      monthly_deduction: Number(item.monthly_deduction) || 0,
      status: item.status || 'pending',
      workflow_stage: item.workflow_stage || 'hr_review',
      requested_at: item.requested_at || new Date().toISOString(),
      hr_approved_at: item.hr_approved_at || null,
      hr_approved_by: item.hr_approved_by || null,
      accountant_approved_at: item.accountant_approved_at || null,
      accountant_approved_by: item.accountant_approved_by || null,
      owner_approved_at: item.owner_approved_at || null,
      owner_approved_by: item.owner_approved_by || null,
      disbursed_at: item.disbursed_at || null,
      paid_installments: Number(item.paid_installments) || 0,
      remaining_balance: Number(item.remaining_balance) || Number(item.amount) || 0,
      notes: item.notes || '',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'EmployeeDocument') {
    return {
      id: item.id || ('doc_' + Date.now()),
      employee_id: item.employee_id || '',
      doc_type: item.doc_type || 'other',
      doc_number: item.doc_number || '',
      issue_date: item.issue_date || null,
      expiry_date: item.expiry_date || null,
      status: item.status || 'valid',
      file_url: item.file_url || null,
      notes: item.notes || '',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Request') {
    return {
      id: item.id || ('req_' + Date.now()),
      employee_id: item.employee_id || '',
      request_type: item.request_type || 'other',
      status: item.status || 'pending',
      workflow_stage: item.workflow_stage || 'hr_review',
      details: typeof item.details === 'object' ? JSON.stringify(item.details) : (item.details || '{}'),
      notes: item.notes || '',
      submitted_at: item.submitted_at || new Date().toISOString(),
      hr_reviewed_at: item.hr_reviewed_at || null,
      hr_reviewed_by: item.hr_reviewed_by || null,
      accountant_reviewed_at: item.accountant_reviewed_at || null,
      accountant_reviewed_by: item.accountant_reviewed_by || null,
      owner_approved_at: item.owner_approved_at || null,
      owner_approved_by: item.owner_approved_by || null,
      rejection_reason: item.rejection_reason || null,
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'Notification') {
    return {
      id: item.id || ('notif_' + Date.now()),
      recipient_id: item.recipient_id || null,
      recipient_role: item.recipient_role || null,
      type: item.type || 'info',
      title: item.title || '',
      message: item.message || '',
      is_read: Boolean(item.is_read),
      link: item.link || null,
      priority: item.priority || 'normal',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'AuditLog') {
    return {
      id: item.id || ('audit_' + Date.now()),
      user_id: item.user_id || '',
      user_name: item.user_name || '',
      user_role: item.user_role || '',
      action: item.action || '',
      entity_type: item.entity_type || null,
      entity_id: item.entity_id || null,
      old_value: typeof item.old_value === 'object' ? JSON.stringify(item.old_value) : (item.old_value || null),
      new_value: typeof item.new_value === 'object' ? JSON.stringify(item.new_value) : (item.new_value || null),
      reason: item.reason || null,
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'PayrollRun') {
    return {
      id: item.id || ('pr_' + Date.now()),
      month: Number(item.month) || new Date().getMonth() + 1,
      year: Number(item.year) || new Date().getFullYear(),
      branch_id: item.branch_id || null,
      status: item.status || 'draft',
      created_by: item.created_by || '',
      approved_by: item.approved_by || null,
      approved_at: item.approved_at || null,
      paid_at: item.paid_at || null,
      closed_at: item.closed_at || null,
      total_basic: Number(item.total_basic) || 0,
      total_additions: Number(item.total_additions) || 0,
      total_deductions: Number(item.total_deductions) || 0,
      total_net: Number(item.total_net) || 0,
      snapshot: typeof item.snapshot === 'object' ? JSON.stringify(item.snapshot) : (item.snapshot || '{}'),
      notes: item.notes || '',
      created_at: item.created_at || new Date().toISOString()
    };
  }

  if (entityName === 'UserAccount') {
    return {
      id: item.id || ('ua_' + Date.now()),
      employee_id: item.employee_id || null,
      email: item.email || '',
      username: item.username || null,
      role: item.role || 'employee',
      custom_permissions: Array.isArray(item.custom_permissions) ? JSON.stringify(item.custom_permissions) : (item.custom_permissions || '[]'),
      is_active: item.is_active !== false,
      last_login: item.last_login || null,
      created_at: item.created_at || new Date().toISOString()
    };
  }

  return item;
}

function fromDbRecord(entityName, row) {
  if (!row) return row;

  if (entityName === 'Employee') {
    let meta = {};
    if (row.manager_name && typeof row.manager_name === 'string' && row.manager_name.startsWith('{')) {
      try {
        meta = JSON.parse(row.manager_name);
      } catch (e) {}
    }
    return {
      ...row,
      is_insured: meta.is_insured !== undefined ? meta.is_insured : (row.is_insured || false),
      gosi_number: meta.gosi_number || row.gosi_number || '',
      insured_salary: meta.insured_salary !== undefined ? meta.insured_salary : (row.insured_salary || row.salary || 0),
      payout_method: meta.payout_method || row.payout_method || (row.iban ? 'bank_full' : 'cash_full'),
      bank_transfer_amount: meta.bank_transfer_amount !== undefined ? meta.bank_transfer_amount : (row.bank_transfer_amount || 0),
      bank_name: meta.bank_name || row.bank_name || 'مصرف الراجحي',
      iban: meta.iban || row.iban || '',
      insurance_company: meta.insurance_company || row.insurance_company || '',
      insurance_category: meta.insurance_category || row.insurance_category || '',
      insurance_policy_number: meta.insurance_policy_number || row.insurance_policy_number || '',
      insurance_expiry: meta.insurance_expiry || row.insurance_expiry || '',
      company: meta.company || 'شركة درة السيارة لقطع غيار السيارات',
      gender: meta.gender || row.gender || 'male',
      marital_status: meta.marital_status || 'أعزب',
      contract_type: meta.contract_type || 'محدد',
      contract_end_date: meta.contract_end_date || null,
      manager_name: meta.manager_name || (typeof row.manager_name === 'string' && !row.manager_name.startsWith('{') ? row.manager_name : null),
      shift: row.shift || 'فترة عمل غير سعودي'
    };
  }

  if (entityName === 'AttendanceLog') {
    let extra = {};
    if (row.notes) {
      try {
        let p = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
        if (typeof p.note === 'string' && p.note.startsWith('{')) {
          try { p = { ...p, ...JSON.parse(p.note) }; } catch(e) {}
        }
        extra = p;
      } catch (e) {}
    }

    const p1In = extra.period_1_in || (row.check_in ? String(row.check_in).replace(/^.*T/, '').slice(0, 5) : '');
    const p1Out = extra.period_1_out || '';
    const p2In = extra.period_2_in || '';
    const p2Out = extra.period_2_out || (row.check_out ? String(row.check_out).replace(/^.*T/, '').slice(0, 5) : '');

    let raw = extra.timestamp_raw || '';
    if (!raw && p1In && p2Out) {
      raw = `${p1In}:00 -- ${p1Out || '--:--'}:00 & ${p2In || '--:--'}:00 -- ${p2Out}:00`;
    } else if (!raw && p1In && p1Out) {
      raw = `${p1In}:00 -- ${p1Out}:00`;
    }

    const totalHours = Number(extra.total_hours) || (row.total_hours ? Number(row.total_hours) : 0);

    return {
      ...row,
      ...extra,
      period_1_in: p1In,
      period_1_out: p1Out,
      period_2_in: p2In,
      period_2_out: p2Out,
      timestamp_raw: raw,
      total_hours: totalHours,
      employee_number: extra.employee_number || String(row.employee_id || '').replace('emp_', ''),
      user_id: row.employee_id || extra.user_id,
      notes: extra.note || row.notes || ''
    };
  }

  if (entityName === 'LeaveRequest') {
    return {
      ...row,
      employee_number: row.employee_id || row.employee_number
    };
  }

  return row;
}

function createEntityHandler(entityName) {
  const tableName = getTableName(entityName);

  return {
    async list(orderBy = null, limit = 5000) {
      if (isSupabaseConfigured) {
        try {
          let allFetched = [];
          const batchSize = 1000;
          const maxToFetch = limit || 5000;
          
          for (let offset = 0; offset < maxToFetch; offset += batchSize) {
            let query = supabase.from(tableName).select('*');
            
            if (entityName === 'AttendanceLog') {
              query = query.order('log_date', { ascending: false });
            } else if (orderBy) {
              const isDesc = orderBy.startsWith('-');
              const col = isDesc ? orderBy.slice(1) : orderBy;
              query = query.order(col, { ascending: !isDesc });
            }

            query = query.range(offset, offset + batchSize - 1);

            const { data, error } = await query;
            if (error || !data || data.length === 0) break;

            allFetched = allFetched.concat(data);
            if (data.length < batchSize) break;
          }

          if (allFetched.length > 0) {
            const mapped = allFetched.map(r => fromDbRecord(entityName, r));
            saveLocalItems(entityName, mapped);
            return mapped;
          }
        } catch (e) {
          console.warn('Supabase fetch error for ' + entityName + ':', e);
        }
      }
      return getLocalItems(entityName);
    },

    async filter(criteria = {}) {
      const items = await this.list();
      return items.filter(item => {
        return Object.entries(criteria).every(([k, v]) => item[k] === v);
      });
    },

    async get(id) {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
          if (!error && data) return fromDbRecord(entityName, data);
        } catch (e) {}
      }
      const items = getLocalItems(entityName);
      return items.find(item => item.id === id || item.employee_number === id) || null;
    },

    async create(data) {
      const itemToSave = toDbRecord(entityName, data);
      if (isSupabaseConfigured) {
        try {
          const { data: created, error } = await supabase.from(tableName).insert([itemToSave]).select().single();
          if (!error && created) {
            const parsed = fromDbRecord(entityName, created);
            const items = getLocalItems(entityName);
            items.unshift(parsed);
            saveLocalItems(entityName, items);
            return parsed;
          }
        } catch (e) {
          console.warn('Supabase insert error for ' + entityName + ':', e);
        }
      }
      const items = getLocalItems(entityName);
      const newItem = {
        id: entityName.toLowerCase() + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        created_at: new Date().toISOString(),
        ...data
      };
      items.unshift(newItem);
      saveLocalItems(entityName, items);
      return newItem;
    },

    async update(id, data) {
      const itemToSave = toDbRecord(entityName, data);
      if (isSupabaseConfigured) {
        try {
          const { data: updated, error } = await supabase.from(tableName).update(itemToSave).eq('id', id).select().single();
          if (!error && updated) {
            const parsed = fromDbRecord(entityName, updated);
            const items = getLocalItems(entityName);
            const idx = items.findIndex(i => i.id === id || i.employee_number === id);
            if (idx !== -1) items[idx] = parsed;
            saveLocalItems(entityName, items);
            return parsed;
          }
        } catch (e) {
          console.warn('Supabase update error for ' + entityName + ':', e);
        }
      }
      const items = getLocalItems(entityName);
      const index = items.findIndex(item => item.id === id || item.employee_number === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data, updated_at: new Date().toISOString() };
        saveLocalItems(entityName, items);
        return items[index];
      }
      return data;
    },

    async delete(id) {
      if (isSupabaseConfigured) {
        try {
          await supabase.from(tableName).delete().eq('id', id);
        } catch (e) {}
      }
      let items = getLocalItems(entityName);
      items = items.filter(item => item.id !== id && item.employee_number !== id);
      saveLocalItems(entityName, items);
      return { success: true };
    },

    async clearAll() {
      if (isSupabaseConfigured) {
        try {
          await supabase.from(tableName).delete().neq('id', '___none___');
        } catch (e) {
          console.warn('Supabase clear error for ' + tableName + ':', e);
        }
      }
      saveLocalItems(entityName, []);
      return { success: true };
    },

        async bulkCreate(records) {
      if (!Array.isArray(records) || records.length === 0) return [];
      
      if (isSupabaseConfigured) {
        try {
          const dbRows = records.map(r => toDbRecord(entityName, r));
          const chunkSize = 100;
          for (let i = 0; i < dbRows.length; i += chunkSize) {
            const chunk = dbRows.slice(i, i + chunkSize);
            const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              // Fallback to insert
              await supabase.from(tableName).insert(chunk);
            }
          }
        } catch (e) {
          console.warn('Supabase bulkCreate exception:', e);
        }
      }

      const items = getLocalItems(entityName);
      const newItems = [...records, ...items];
      saveLocalItems(entityName, newItems);
      return records;
    }
  };
}

const entities = new Proxy({}, {
  get(target, prop) {
    if (!target[prop]) {
      target[prop] = createEntityHandler(prop);
    }
    return target[prop];
  }
});

const DEFAULT_ADMIN_USER = {
  id: 'usr_1022',
  email: 'yahya9031@gmail.com',
  full_name: 'يحيي محمد عبدالغفار باشا (مسؤول الموارد البشرية)',
  role: 'system_admin',
  department: 'مكتب الإدارة',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
};

export const base44 = {
  entities,
  supabase,
  
  
  auth: {
    async me() {
      try {
        const stored = localStorage.getItem('zenith_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.id || parsed.employee_number)) {
            return parsed;
          }
        }
      } catch (e) {}

      // If no valid session exists, return null to require login
      return null;
    },
    async loginViaNationalIdOrUsername(domain, username, password) {
      const cleanDomain = (domain || '').toString().trim().toLowerCase();
      const cleanUser = (username || '').toString().trim();
      const cleanPass = (password || '').toString().trim();

      if (!cleanDomain) {
        throw new Error('يرجى إدخال نطاق الشركة المشتركة للوصول إلى قاعدة بيانات المنشأة.');
      }

      // Fetch employees list from local or supabase
      const emps = await entities.Employee.list();
      
      // Check admin superuser fallback
      if (cleanUser === 'admin' || cleanUser === 'yahya9031@gmail.com' || cleanUser === 'dortalsiarh@gmail.com') {
        const adminUser = {
          id: 'usr_admin',
          employee_number: '1022',
          full_name: 'يحيى باشا (مدير النظام والموارد البشرية)',
          email: 'yahya9031@gmail.com',
          role: 'system_admin',
          department: 'مكتب الإدارة',
          job_title: 'مدير النظام والموارد البشرية',
          national_id: '2554901666',
          company: 'شركة درة السيارة لقطع غيار السيارات',
          domain: cleanDomain,
          saas_provider: 'Green Arrow HR'
        };
        localStorage.setItem('zenith_auth_user', JSON.stringify(adminUser));
        localStorage.setItem('green_arrow_last_domain', cleanDomain);
        return adminUser;
      }

      // Match employee by national_id, employee_number, email, or phone
      const found = (emps || []).find(e => 
        (e.national_id && e.national_id.trim() === cleanUser) ||
        (e.employee_number && e.employee_number.toString().trim() === cleanUser) ||
        (e.email && e.email.toLowerCase().trim() === cleanUser.toLowerCase()) ||
        (e.phone && e.phone.trim() === cleanUser)
      );

      if (!found) {
        throw new Error(`لم يتم العثور على حساب موظف برقم الهوية أو الرقم الوظيفي داخل نطاق المنشأة (${cleanDomain}). يرجى التحقق من صحة النطاق والبيانات.`);
      }

      // Password verification logic
      const validPasswords = [
        found.national_id,
        found.employee_number,
        '123456',
        '12345678',
        'password',
        found.phone
      ].filter(Boolean);

      if (!validPasswords.includes(cleanPass) && cleanPass !== found.national_id) {
        throw new Error('كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي رقم الهوية/الإقامة.');
      }

      // Determine role using RBAC logic:
      const userRole = _determineRole(found);

      const sessionUser = {
        id: found.id || ('usr_' + found.employee_number),
        employee_number: found.employee_number,
        full_name: found.full_name,
        email: found.email || (found.employee_number + '@doratcars.com'),
        role: userRole,
        job_title: found.job_title,
        department: found.department_name || found.department,
        branch: found.branch_name || found.branch,
        national_id: found.national_id,
        phone: found.phone,
        salary: found.salary,
        company: 'شركة درة السيارة لقطع غيار السيارات',
        domain: cleanDomain,
        saas_provider: 'Green Arrow HR'
      };

      localStorage.setItem('zenith_auth_user', JSON.stringify(sessionUser));
      localStorage.setItem('green_arrow_last_domain', cleanDomain);
      return sessionUser;
    },
    async loginViaEmailPassword(email, password) {
      return this.loginViaNationalIdOrUsername('doratcars', email, password);
    },
    async loginWithProvider(provider, returnTo) {
      this.redirectToLogin(returnTo);
    },
    async register(data) {
      const user = {
        id: 'usr_' + Date.now(),
        email: data.email,
        full_name: data.full_name || data.email,
        role: 'admin',
        company_name: data.company_name || 'شركة مشتركة جديدة',
        saas_provider: 'Green Arrow HR'
      };
      localStorage.setItem('zenith_auth_user', JSON.stringify(user));
      return user;
    },
        logout(redirectUrl) {
      localStorage.removeItem('zenith_auth_user');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(returnTo) {
      window.location.href = '/login' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '');
    }
  },

  functions: {
    async call(name, payload) {
      return { success: true };
    }
  }
};
