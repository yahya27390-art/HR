import EmployeeForm from '@/components/EmployeeForm';
import { MaskedSalary, PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission, canAccessEmployeeData, canViewSalary } from '@/lib/rbac';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Building2,
  Calendar,
  DollarSign,
  IdCard,
  Globe,
  Clock,
  FileText,
  ShieldCheck,
  CalendarDays,
  Coins,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Award,
  BookOpen,
  FolderOpen,
  Users2,
  Package,
  AlertOctagon,
  Bell,
  Activity,
  Edit3,
  KeyRound,
  Printer,
  ChevronLeft,
  Search,
  CheckCircle2,
  Upload,
  Eye,
  Download,
  Trash2,
  FilePlus,
  AlertCircle,
  X,
  Shield,
  Car,
  Laptop,
  Smartphone,
  Key,
  CreditCard,
  CheckCheck,
  HelpCircle,
  HeartHandshake,
  GraduationCap,
  Star,
  UserCheck2,
  FileSpreadsheet,
  Receipt,
  Send,
  Plus,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getAdvances, saveAdvance } from '@/lib/payrollEngine';
import AdvanceVoucherA4Modal from '@/components/AdvanceVoucherA4Modal';

// Transliteration dictionary for all Green Arrow employees
const NAME_EN_MAP = {
  'فهد ناصر محمد الجوعي': 'Fahad Nasser Mohammed Al-Jowai',
  'يحيي محمد عبدالغفار باشا': 'Yahya Mohammed Abdulghaffar Basha',
  'هشام ابوالفضل زغلول': 'Hesham Aboulfadl Zaghloul',
  'محمود طه المحيميد': 'Mahmoud Taha Al-Muhaimeed',
  'صالح علي المحيميد': 'Saleh Ali Al-Muhaimeed',
  'خالد ناصر محمد الجوعي': 'Khaled Nasser Mohammed Al-Jowai',
  'عبد العزيز ناصر محمد الجوعي': 'Abdulaziz Nasser Mohammed Al-Jowai',
  'محمد عادل احمد نعمان': 'Mohammed Adel Ahmed Noaman',
  'محمد سالم صالح أحمد المردم': 'Mohammed Salem Saleh Al-Mardam',
  'عاصم ابراهيم الرياعي': 'Asem Ibrahim Al-Rubaie',
  'عزام علي السعوي': 'Azzam Ali Al-Saawi',
  'سفيان عبد الرحمن الضالع': 'Sofyan Abdulrahman Al-Dhalea',
  'عبد الله يحيى إبراهيم التويجري': 'Abdullah Yahya Ibrahim Al-Tuwaijri',
  'إبراهيم عبد العزيز التويجري': 'Ibrahim Abdulaziz Al-Tuwaijri',
  'عبد الله ناصر عبد الله محمد عمر': 'Abdullah Nasser Abdullah Omar',
  'محمد صالح محمد السعوي': 'Mohammed Saleh Mohammed Al-Saawi',
  'طه محمود المحيميد': 'Taha Mahmoud Al-Muhaimeed',
  'وضاح صالح سالم أحمد العولقي': 'Waddah Saleh Salem Al-Awlaqi',
  'محمدعبد محمد البليهي': 'Mohammed-Abd Mohammed Al-Bulaihi'
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || 'employee';
  const canEdit = userRole === 'owner' || userRole === 'system_admin' || userRole === 'hr' || userRole === 'accountant';
  const { toast } = useToast();

  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Profile Section Tab
  const [activeTab, setActiveTab] = useState('personal');

  // Modals for CRUD
  const [editEmployeeModal, setEditEmployeeModal] = useState(false);
  const [uploadDocModal, setUploadDocModal] = useState(false);
  const [editInsuranceModal, setEditInsuranceModal] = useState(false);
  const [editAllowancesModal, setEditAllowancesModal] = useState(false);
  const [allowanceForm, setAllowanceForm] = useState({
    housing_allowance: 0,
    transport_allowance: 0,
    electricity_allowance: 0,
    phone_allowance: 0,
    other_allowance: 0,
    allowance_notes: ''
  });
  const [addCustodyModal, setAddCustodyModal] = useState(false);
  const [addPenaltyModal, setAddPenaltyModal] = useState(false);
  const [addDependentModal, setAddDependentModal] = useState(false);
  const [addTrainingModal, setAddTrainingModal] = useState(false);
  const [addEvalModal, setAddEvalModal] = useState(false);
  const [grantLeaveModal, setGrantLeaveModal] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedAdvanceForVoucher, setSelectedAdvanceForVoucher] = useState(null);

  // Form states
  const [docForm, setDocForm] = useState({ name: '', type: 'contract', file: null });
  
  const [insuranceForm, setInsuranceForm] = useState({
    insurance_company: 'شركة بوبا العربية للتأمين التعاوني (Bupa)',
    insurance_category: 'VIP - الفئة الذهبية الشاملة',
    insurance_policy_number: 'POL-2026-GA-9941',
    insurance_expiry: '2027-08-31',
    gosi_number: 'GSI-10042918',
    is_insured: true
  });

  const [custodyList, setCustodyList] = useState([
    { id: 'c1', name: 'سيارة تويوتا يارس موديل 2024 (لوحة: أ ب ج 1234)', type: 'car', serial_number: 'CAR-KSA-7782-B', delivery_date: '2026-01-15', value: 55000, status: 'active', notes: 'عهدة رسمية لتنقلات فرع كيا' },
    { id: 'c2', name: 'جهاز لابتوب Dell Latitude Core i7 + حقيبة', type: 'laptop', serial_number: 'DELL-SN-998124', delivery_date: '2026-02-01', value: 4500, status: 'active', notes: 'جهاز العمل المكتبي ونظام الفواتير' },
    { id: 'c3', name: 'هاتف ذكي Samsung Galaxy A54 + شريحة بيانات أعمال', type: 'phone', serial_number: 'IMEI-8891230192', delivery_date: '2026-02-01', value: 1400, status: 'active', notes: 'رقم التواصل المعتمد للعملاء' }
  ]);

  const [custodyForm, setCustodyForm] = useState({
    name: '',
    type: 'car',
    serial_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    value: 0,
    status: 'active',
    notes: ''
  });

  const [penaltiesList, setPenaltiesList] = useState([
    { id: 'p1', type: 'reward', title: 'مكافأة تميز وإنجاز مالي', amount: 500, date: '2026-08-15', reason: 'تحقيق أعلى مبيعات لفرع قطع الغيار والالتزام التام بساعات الدوام', issued_by: 'فهد ناصر محمد الجوعي (المدير العام)' },
    { id: 'p2', type: 'appreciation', title: 'شهادة شكر وتقدير للأداء الاستثنائي', amount: 0, date: '2026-06-30', reason: 'الانضباط والتعاون المثالي في تنظيم المستودع وجرد الأصناف', issued_by: 'يحيي محمد عبدالغفار باشا (مدير الموارد البشرية)' }
  ]);

  const [penaltyForm, setPenaltyForm] = useState({
    type: 'reward',
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    issued_by: 'فهد ناصر محمد الجوعي (المدير العام)'
  });

  const [dependentsList, setDependentsList] = useState([
    { id: 'd1', name: 'أميرة عبد الله الشمري', relation: 'زوجة', national_id: '1099238129', birth_date: '1995-04-12', medical_insurance: 'مشمولة بالتأمين VIP ✓' },
    { id: 'd2', name: 'ريان صالح علي المحيميد', relation: 'ابن', national_id: '1192837482', birth_date: '2021-09-05', medical_insurance: 'مشمول بالتأمين VIP ✓' }
  ]);

  const [dependentForm, setDependentForm] = useState({
    name: '',
    relation: 'زوجة',
    national_id: '',
    birth_date: '1995-01-01',
    medical_insurance_included: true
  });

  const [trainingsList, setTrainingsList] = useState([
    { id: 't1', title: 'إدارة مبيعات وخدمة عملاء قطاع السيارات', provider: 'أكاديمية التدريب المهني المعتمدة', hours: 24, completion_date: '2026-04-10', score: 'ممتاز (98%)' },
    { id: 't2', title: 'السلامة والصحة المهنية وإدارة المخازن والمستودعات', provider: 'المعهد السعودي العالي', hours: 16, completion_date: '2026-02-20', score: 'اجتياز مع مرتبة الشرف' }
  ]);

  const [trainingForm, setTrainingForm] = useState({
    title: '',
    provider: '',
    hours: 20,
    completion_date: new Date().toISOString().split('T')[0],
    score: 'ممتاز'
  });

  const [evaluationsList, setEvaluationsList] = useState([
    { id: 'e1', period: 'تقييم الربع الثاني 2026', score_punctuality: 98, score_performance: 95, score_teamwork: 96, total_score: 96.3, grade: 'ممتاز مرتفع (A+)', evaluator: 'فهد ناصر محمد الجوعي', date: '2026-07-01', notes: 'أداء متميز وتفانٍ في العمل وتحقيق كافة المستهدفات المطلوبة.' },
    { id: 'e2', period: 'تقييم الربع الأول 2026', score_punctuality: 95, score_performance: 92, score_teamwork: 94, total_score: 93.6, grade: 'ممتاز (A)', evaluator: 'يحيي محمد عبدالغفار باشا', date: '2026-04-01', notes: 'موظف ملتزم ومبادر في تطوير أداء الفرع.' }
  ]);

  const [evalForm, setEvalForm] = useState({
    period: 'تقييم الربع الثالث 2026',
    score_punctuality: 95,
    score_performance: 95,
    score_teamwork: 95,
    total_score: 95,
    evaluator: 'فهد ناصر محمد الجوعي (المدير العام)',
    notes: 'موظف متميز ومثالي في الانضباط وتحقيق الأهداف.'
  });

  const [grantLeaveForm, setGrantLeaveForm] = useState({
    leave_type: 'سنوية',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: 'إجازة سنوية اعتيادية (تخصم من رصيد الـ 21 يوماً)'
  });

  // Load Data from Supabase & Storage
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, deps, shs, brs, reqs, logs] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.Department.list(),
        base44.entities.Shift.list(),
        base44.entities.Branch.list(),
        base44.entities.LeaveRequest.list(),
        base44.entities.AttendanceLog.list('-log_date', 3000)
      ]);

      setEmployees(emps || []);
      setDepartments(deps || []);
      setShifts(shs || []);
      setBranches(brs || []);
      setLeaveRequests(reqs || []);
      setAttendanceLogs(logs || []);
      setAdvancesList(getAdvances() || []);

      const targetId = id || user?.employee_number || user?.id;
      const found = (emps || []).find(e => {
        if (!targetId && !user) return false;
        if (id) {
          return String(e.id) === String(id) || String(e.employee_number) === String(id);
        }
        return (
          String(e.id) === String(targetId) ||
          String(e.employee_number) === String(targetId) ||
          (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
          (user?.full_name && e.full_name && e.full_name.trim() === user.full_name.trim()) ||
          (user?.national_id && e.national_id && e.national_id === user.national_id)
        );
      });
      if (found) {
        setEmployee(found);
        setInsuranceForm({
          insurance_company: found.insurance_company || 'شركة بوبا العربية للتأمين التعاوني (Bupa)',
          insurance_category: found.insurance_category || 'VIP - الفئة الذهبية الشاملة',
          insurance_policy_number: found.insurance_policy_number || 'POL-2026-GA-9941',
          insurance_expiry: found.insurance_expiry || '2027-08-31',
          gosi_number: found.gosi_number || ('GSI-' + (found.employee_number || '1001')),
          insured_salary: Number(found.insured_salary || found.salary) || 0,
          is_insured: found.is_insured !== false && found.is_insured !== 'false',
          payout_method: found.payout_method || (found.iban ? 'bank_full' : 'cash_full'),
          bank_transfer_amount: Number(found.bank_transfer_amount) || 0,
          bank_name: found.bank_name || 'مصرف الراجحي',
          iban: found.iban || ''
        });

        // Load custom lists from local storage if exists
        try {
          const cSaved = localStorage.getItem('hr_custody_' + found.id);
          if (cSaved) setCustodyList(JSON.parse(cSaved));
          const pSaved = localStorage.getItem('hr_penalties_' + found.id);
          if (pSaved) setPenaltiesList(JSON.parse(pSaved));
          const dSaved = localStorage.getItem('hr_dependents_' + found.id);
          if (dSaved) setDependentsList(JSON.parse(dSaved));
          const tSaved = localStorage.getItem('hr_trainings_' + found.id);
          if (tSaved) setTrainingsList(JSON.parse(tSaved));
          const eSaved = localStorage.getItem('hr_evals_' + found.id);
          if (eSaved) setEvaluationsList(JSON.parse(eSaved));
        } catch {}
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في تحميل ملف الموظف', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Insurance updates to Supabase
  const handleSaveInsurance = async () => {
    if (!employee) return;
    try {
      const isInsured = insuranceForm.is_insured === true || insuranceForm.is_insured === 'true';
      const updated = {
        ...employee,
        is_insured: isInsured,
        gosi_number: isInsured ? (insuranceForm.gosi_number || ('GSI-' + (employee.employee_number || '1001'))) : '',
        insured_salary: Number(insuranceForm.insured_salary) || Number(employee.salary) || 0,
        payout_method: insuranceForm.payout_method || (insuranceForm.iban ? 'bank_full' : 'cash_full'),
        bank_transfer_amount: Number(insuranceForm.bank_transfer_amount) || 0,
        bank_name: insuranceForm.bank_name || 'مصرف الراجحي',
        iban: insuranceForm.iban || '',
        insurance_company: insuranceForm.insurance_company,
        insurance_category: insuranceForm.insurance_category,
        insurance_policy_number: insuranceForm.insurance_policy_number,
        insurance_expiry: insuranceForm.insurance_expiry
      };
      
      // 1. Update in Base44 entity store
      await base44.entities.Employee.update(employee.id, updated);
      setEmployee(updated);

      // 2. Direct guarantee update in local storage caches
      const storageKeys = ['green_arrow_hr_Employee', 'green_arrow_hr_employees', 'hr_flow_employees'];
      storageKeys.forEach(k => {
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(list)) {
            const idx = list.findIndex(e => String(e.id) === String(employee.id) || String(e.employee_number) === String(employee.employee_number));
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...updated };
              localStorage.setItem(k, JSON.stringify(list));
            }
          }
        } catch (e) {}
      });

      // 3. Dispatch global custom event for other open pages/tabs
      window.dispatchEvent(new CustomEvent('hr_employee_updated', { detail: updated }));

      setEditInsuranceModal(false);
      toast({ title: '✓ تم حفظ وتحديث بيانات التأمين وطريقة الصرف المالي بنجاح' });
    } catch (e) {
      toast({ title: 'خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    }
  };

  // Add Custody Asset
  const handleAddCustody = () => {
    if (!custodyForm.name) return;
    const newItem = { id: 'c_' + Date.now(), ...custodyForm };
    const updated = [newItem, ...custodyList];
    setCustodyList(updated);
    if (employee) localStorage.setItem('hr_custody_' + employee.id, JSON.stringify(updated));
    setAddCustodyModal(false);
    setCustodyForm({ name: '', type: 'car', serial_number: '', delivery_date: new Date().toISOString().split('T')[0], value: 0, status: 'active', notes: '' });
    toast({ title: '✓ تم قيد العهدة الجديدة على الموظف بنجاح' });
  };

  // Add Penalty / Reward
  const handleAddPenalty = () => {
    if (!penaltyForm.title) return;
    const newItem = { id: 'p_' + Date.now(), ...penaltyForm };
    const updated = [newItem, ...penaltiesList];
    setPenaltiesList(updated);
    if (employee) localStorage.setItem('hr_penalties_' + employee.id, JSON.stringify(updated));
    setAddPenaltyModal(false);
    setPenaltyForm({ type: 'reward', title: '', amount: 0, date: new Date().toISOString().split('T')[0], reason: '', issued_by: 'فهد ناصر محمد الجوعي' });
    toast({ title: '✓ تم تسجيل الإجراء / المكافأة بنجاح' });
  };

  // Add Dependent
  const handleAddDependent = () => {
    if (!dependentForm.name) return;
    const newItem = { id: 'd_' + Date.now(), ...dependentForm, medical_insurance: dependentForm.medical_insurance_included ? 'مشمول بالتأمين VIP ✓' : 'غير مشمول' };
    const updated = [newItem, ...dependentsList];
    setDependentsList(updated);
    if (employee) localStorage.setItem('hr_dependents_' + employee.id, JSON.stringify(updated));
    setAddDependentModal(false);
    setDependentForm({ name: '', relation: 'زوجة', national_id: '', birth_date: '1995-01-01', medical_insurance_included: true });
    toast({ title: '✓ تم إضافة التابع وتوثيق بياناته بنجاح' });
  };

  // Add Training
  const handleAddTraining = () => {
    if (!trainingForm.title) return;
    const newItem = { id: 't_' + Date.now(), ...trainingForm };
    const updated = [newItem, ...trainingsList];
    setTrainingsList(updated);
    if (employee) localStorage.setItem('hr_trainings_' + employee.id, JSON.stringify(updated));
    setAddTrainingModal(false);
    setTrainingForm({ title: '', provider: '', hours: 20, completion_date: new Date().toISOString().split('T')[0], score: 'ممتاز' });
    toast({ title: '✓ تم توثيق الدورة التدريبية بنجاح' });
  };

  // Add Evaluation
  const handleAddEvaluation = () => {
    const tot = Math.round((Number(evalForm.score_punctuality) + Number(evalForm.score_performance) + Number(evalForm.score_teamwork)) / 3 * 10) / 10;
    const newItem = { id: 'e_' + Date.now(), ...evalForm, total_score: tot, grade: tot >= 95 ? 'ممتاز مرتفع (A+)' : (tot >= 90 ? 'ممتاز (A)' : 'جيد جداً (B)'), date: new Date().toISOString().split('T')[0] };
    const updated = [newItem, ...evaluationsList];
    setEvaluationsList(updated);
    if (employee) localStorage.setItem('hr_evals_' + employee.id, JSON.stringify(updated));
    setAddEvalModal(false);
    toast({ title: '✓ تم تسجيل واعتماد التقييم الوظيفي بنجاح' });
  };

  // Grant Leave directly
  const handleGrantLeave = async () => {
    if (!employee) return;
    const d1 = new Date(grantLeaveForm.start_date);
    const d2 = new Date(grantLeaveForm.end_date);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

    try {
      await base44.entities.LeaveRequest.create({
        id: 'leave_' + Date.now(),
        employee_id: employee.id,
        employee_number: employee.employee_number,
        employee_name: employee.full_name,
        leave_type: grantLeaveForm.leave_type,
        start_date: grantLeaveForm.start_date,
        end_date: grantLeaveForm.end_date,
        days_count: days,
        reason: grantLeaveForm.reason,
        status: 'approved',
        created_at: new Date().toISOString()
      });

      setGrantLeaveModal(false);
      toast({ title: `✓ تم منح واعتماد إجازة ${grantLeaveForm.leave_type} (${days} يوم) للموظف بنجاح` });
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };


  // Strict Employee Data Isolation Check
  const isAuthorized = useMemo(() => {
    if (!user || !employee) return true;
    return canAccessEmployeeData(user, employee);
  }, [user, employee]);

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6" dir="rtl">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 shadow-xl rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 mx-auto flex items-center justify-center text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-heading font-black text-slate-900 dark:text-white">
            غير مصرح بالوصول لهذا الملف
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تم تطبيق سياسة أمان وحماية البيانات الصارمة. لا يمكنك استعراض الملفات الوظيفية أو المالية لموظفين آخرين.
          </p>
          <Button
            onClick={() => navigate('/portal')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs h-11 shadow-md"
          >
            العودة إلى بوابتي الشخصية ➔
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Security guard: If normal employee, only allow viewing own profile
  const canViewAllEmployees = hasPermission(user, 'employees.view');
  const isOwnProfile = employee && (
    String(employee.employee_number) === String(user?.employee_number) ||
    String(employee.id) === String(user?.id) ||
    (user?.email && employee.email && employee.email.toLowerCase() === user.email.toLowerCase())
  );

  if (employee && !canViewAllEmployees && !isOwnProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-3xl shadow-lg">
          🔒
        </div>
        <h2 className="text-xl font-black text-foreground">غير مصرح بالوصول</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          ليس لديك صلاحية للاطلاع على ملفات الموظفين الآخرين.
        </p>
        <Button onClick={() => navigate('/employee-profile')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold px-6">
          الانتقال إلى ملفي الشخصي 360°
        </Button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <h2 className="text-base font-bold text-foreground">لم يتم العثور على ملف الموظف</h2>
        <Button onClick={() => navigate(hasPermission(user, 'employees.view') ? '/employees' : '/')} className="mt-4 bg-emerald-600 text-white rounded-xl text-xs font-bold">
          {hasPermission(user, 'employees.view') ? 'العودة لقائمة الموظفين' : 'العودة للرئيسية'}
        </Button>
      </div>
    );
  }

  // Profile Subsections
  const profileSubSections = [
    { id: 'personal', label: 'التفاصيل الشخصية', icon: User },
    { id: 'company', label: 'تفاصيل الشركة', icon: Building2 },
    { id: 'documents', label: 'المستندات ورفع العقود', icon: FolderOpen },
    { id: 'payslips', label: 'كشوف راتبي', icon: DollarSign },
    { id: 'insurance', label: 'التأمين والتأمينات', icon: ShieldCheck },
    { id: 'other_balances', label: 'رصيدي أخرى والسلف', icon: Coins },
    { id: 'team', label: 'فريق العمل والفرع', icon: Users2 },
    { id: 'leave_details', label: 'تفاصيل الإجازة (21 يوم)', icon: CalendarDays },
    { id: 'leave_history', label: 'سجل الإجازات المعتمدة', icon: Calendar },
    { id: 'training', label: 'الدورات التدريبية', icon: BookOpen },
    { id: 'evaluation', label: 'التقييم والأداء', icon: Award },
    { id: 'dependents', label: 'التابعين والمرافقين', icon: HeartHandshake },
    { id: 'custody', label: 'العهود والأصول المقيدة', icon: Package },
    { id: 'penalties', label: 'الجزاءات والمكافآت', icon: AlertOctagon },
    { id: 'notifications', label: 'الإشعارات والرسائل', icon: Bell },
    { id: 'activity', label: 'النشاط الأخير', icon: Activity },
  ];

  const fullNameEn = NAME_EN_MAP[employee.full_name] || employee.full_name_en || employee.full_name;
  const isInsured = employee.is_insured !== false || employee.nationality === 'سعودي';

  // Annual Leave Calculations
  const empLeaves = leaveRequests.filter(r => String(r.employee_number) === String(employee.employee_number) || String(r.employee_id) === String(employee.id));
  const usedAnnualDays = empLeaves.filter(r => r.status === 'approved' && (r.leave_type?.includes('سنو') || r.leave_type === 'annual_leave')).reduce((sum, r) => sum + (Number(r.days_count) || 1), 0);
  const totalAnnual = isInsured ? 21 : 30;
  const remAnnual = Math.max(0, totalAnnual - usedAnnualDays);
  const pctAnnual = Math.min(100, Math.round((usedAnnualDays / totalAnnual) * 100));

  // Advances Calculations
  const empAdvances = advancesList.filter(a => String(a.employee_number) === String(employee.employee_number));
  const activeAdvance = empAdvances.find(a => a.status === 'active' || a.status === 'approved_pending_accountant');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      
      {/* ─── TOP EXECUTIVE HERO PROFILE BANNER ────────────────────────────── */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-700/20">
              {employee.full_name?.slice(0, 2) || 'مو'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-black text-xl text-foreground">{employee.full_name}</h1>
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-mono font-bold text-xs">
                  #{employee.employee_number}
                </Badge>
                {isInsured ? (
                  <Badge className="bg-sky-500/10 text-sky-700 border-sky-300 text-xs font-bold">
                    مؤمن عليه (21 يوم) ✓
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-bold">غير مؤمن</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">{fullNameEn}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-emerald-600" />{employee.job_title || 'موظف'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-sky-600" />{employee.branch_name || employee.branch || 'مكتب الإدارة'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-600" />{employee.shift || 'فترة عمل'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasPermission(user, 'leave.create') && (
              <Button
                onClick={() => setGrantLeaveModal(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
              >
                <CalendarDays className="w-4 h-4" />
                <span>+ منح إجازة</span>
              </Button>
            )}
            {hasPermission(user, 'documents.edit') && (
              <Button
                onClick={() => setUploadDocModal(true)}
                variant="outline"
                className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
              >
                <Upload className="w-4 h-4" />
                <span>+ رفع مستند</span>
              </Button>
            )}
            

            <Button
              onClick={() => window.print()}
              variant="outline"
              className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الملف A4</span>
            </Button>
          </div>

        </div>

        {/* ─── QUICK METRICS BAR ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-border/80 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">الراتب الأساسي:</div>
            <div className="font-mono font-black text-sm text-foreground mt-0.5"><MaskedSalary value={employee.salary} /></div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">رصيد الإجازات السنوية:</div>
            <div className="font-mono font-black text-sm text-teal-600 mt-0.5">{remAnnual} / {totalAnnual} يوم</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">العهود المسلمة:</div>
            <div className="font-mono font-black text-sm text-foreground mt-0.5">{custodyList.filter(c => c.status === 'active').length} عهدة نشطة</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">التأمين الصحي:</div>
            <div className="font-bold text-[11px] text-sky-600 mt-0.5 truncate">{insuranceForm.insurance_category.split('-')[0]}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">رصيد السلف الحالية:</div>
            <div className="font-mono font-black text-sm text-rose-600 mt-0.5">{activeAdvance ? `${Number(activeAdvance.remaining_balance || activeAdvance.total_amount).toLocaleString('en-US')} ر.س` : '0 ر.س ✓'}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
            <div className="text-muted-foreground text-[10px] font-bold">التقييم العام:</div>
            <div className="font-mono font-black text-sm text-emerald-600 mt-0.5">96.3% (A+)</div>
          </div>
        </div>
      </div>

      {/* ─── 360 LAYOUT: SIDEBAR TABS & ACTIVE PANEL ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDEBAR TABS LIST (4 COLS) */}
        <div className="lg:col-span-4 space-y-1.5">
          <Card className="p-3 rounded-3xl border shadow-sm space-y-1">
            <div className="px-3 py-2 text-xs font-heading font-black text-muted-foreground border-b mb-1">
              أقسام وتبويبات ملف الموظف 360°
            </div>
            {profileSubSections.map(sec => {
              const IconComp = sec.icon;
              const isCurrent = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    isCurrent 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{sec.label}</span>
                  </div>
                  <ChevronLeft className={`w-3.5 h-3.5 opacity-60 ${isCurrent ? 'text-white' : ''}`} />
                </button>
              );
            })}
          </Card>
        </div>

        {/* ACTIVE TAB CONTENT PANEL (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: PERSONAL DETAILS
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'personal' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>البيانات الشخصية والرسمية للموظف</span>
                </h3>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setEditEmployeeModal(true)} className="rounded-xl text-xs font-bold h-8 gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل البيانات</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الاسم الكامل بالعربية:</span>
                  <div className="font-heading font-bold text-foreground text-sm">{employee.full_name}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الاسم باللغة الإنجليزية:</span>
                  <div className="font-mono font-bold text-foreground text-sm">{fullNameEn}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">رقم الهوية الوطنية / الإقامة:</span>
                  <div className="font-mono font-bold text-foreground">{employee.national_id || '1004000000'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الجنسية:</span>
                  <div className="font-bold text-foreground">{employee.nationality || 'سعودي'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">رقم الجوال:</span>
                  <div className="font-mono font-bold text-foreground" dir="ltr">{employee.phone || '966500000000'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">البريد الإلكتروني:</span>
                  <div className="font-mono font-bold text-foreground">{employee.email || 'employee@doratcars.com'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">تاريخ الميلاد:</span>
                  <div className="font-mono font-bold text-foreground">{employee.birth_date || '1992-05-15'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الحالة الاجتماعية:</span>
                  <div className="font-bold text-foreground">{employee.marital_status || 'متزوج'}</div>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: COMPANY DETAILS
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'company' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>بيانات العمل والتعيين والوردية</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">المسمى الوظيفي:</span>
                  <div className="font-heading font-bold text-foreground text-sm">{employee.job_title}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الفرع المعتمد:</span>
                  <div className="font-bold text-foreground text-sm">{employee.branch_name || employee.branch || 'مكتب الإدارة'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">القسم / الإدارة:</span>
                  <div className="font-bold text-foreground">{employee.department_name || 'قسم المبيعات'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">الوردية المخصصة:</span>
                  <div className="font-bold text-emerald-600">{employee.shift || 'فترة عمل'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">تاريخ المباشرة والتعيين:</span>
                  <div className="font-mono font-bold text-foreground">{employee.join_date || '2023-01-01'}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl space-y-0.5">
                  <span className="text-muted-foreground text-[10px]">المدير المباشر:</span>
                  <div className="font-bold text-foreground">{employee.manager_name || 'فهد ناصر محمد الجوعي'}</div>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3: INSURANCE & GOSI (التأمين والتأمينات)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'insurance' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>بيانات التأمين الصحي والتأمينات الاجتماعية (GOSI)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">التغطية الطبية والاشتراك الرسمي بالتأمينات الاجتماعية</p>
                </div>
                {canEdit && (
                <Button size="sm" onClick={() => {
                  if (employee) {
                    setInsuranceForm({
                      insurance_company: employee.insurance_company || 'شركة بوبا العربية للتأمين التعاوني (Bupa)',
                      insurance_category: employee.insurance_category || 'VIP - الفئة الذهبية الشاملة',
                      insurance_policy_number: employee.insurance_policy_number || 'POL-2026-GA-9941',
                      insurance_expiry: employee.insurance_expiry || '2027-08-31',
                      gosi_number: employee.gosi_number || ('GSI-' + (employee.employee_number || '1001')),
                      insured_salary: Number(employee.insured_salary || employee.salary) || 0,
                      is_insured: employee.is_insured !== false && employee.is_insured !== 'false',
                      payout_method: employee.payout_method || (employee.iban ? 'bank_full' : 'cash_full'),
                      bank_transfer_amount: Number(employee.bank_transfer_amount) || 0,
                      bank_name: employee.bank_name || 'مصرف الراجحي',
                      iban: employee.iban || ''
                    });
                  }
                  setEditInsuranceModal(true);
                }} className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل التأمين</span>
                </Button>
                )}
              </div>

              {/* Medical Insurance Box */}
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-sky-600" />
                    <span>وثيقة التأمين الطبي للموظف والتابعين</span>
                  </span>
                  <Badge className="bg-sky-600 text-white font-bold text-[10px]">{insuranceForm.insurance_category}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">الشركة المؤمنة:</span>
                    <div className="font-bold text-foreground">{insuranceForm.insurance_company}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">رقم الوثيقة المعتمد:</span>
                    <div className="font-mono font-bold text-foreground">{insuranceForm.insurance_policy_number}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">تاريخ انتهاء الوثيقة:</span>
                    <div className="font-mono font-bold text-foreground">{insuranceForm.insurance_expiry}</div>
                  </div>
                </div>
              </div>

              {/* GOSI Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>المؤسسة العامة للتأمينات الاجتماعية (GOSI)</span>
                  </span>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px]">اشتراك نشط ومفعل ✓</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">رقم المشترك بالتأمينات:</span>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">{insuranceForm.gosi_number}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">نسبة تحمل الموظف:</span>
                    <div className="font-bold text-emerald-600">0% (100% تتحملها المنشأة) ✓</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">الراتب الخاضع للاشتراك:</span>
                    <div className="font-mono font-bold text-foreground"><MaskedSalary value={employee.salary} /></div>
                  </div>
                </div>
              </div>

              {/* Banking & Payout Split Method Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>طريقة استلام الراتب وتوزيع الصرف (بنك / كاش)</span>
                  </span>
                  <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                    {employee.payout_method === 'split_bank_cash' ? 'تحويل جزئي + كاش 🔀' : employee.payout_method === 'cash_full' ? 'تسليم نقدي كامل 💵' : 'تحويل بنكي كامل 🏦'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">طريقة الصرف:</span>
                    <div className="font-bold text-indigo-950 dark:text-indigo-200">
                      {employee.payout_method === 'split_bank_cash' ? 'بنك + كاش (مدمج)' : employee.payout_method === 'cash_full' ? 'كاش من الخزينة' : 'تحويل بنكي 100%'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">مبلغ التحويل البنكي المعتمد:</span>
                    <div className="font-mono font-black text-indigo-700 dark:text-indigo-400">
                      <MaskedSalary value={employee.payout_method === 'split_bank_cash' ? (employee.bank_transfer_amount || employee.salary) : (employee.payout_method === 'cash_full' ? 0 : employee.salary)} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">اسم البنك المعتمد:</span>
                    <div className="font-bold text-foreground">{employee.bank_name || 'مصرف الراجحي'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">رقم الآيبان (IBAN):</span>
                    <div className="font-mono font-bold text-foreground text-[10px] truncate">{employee.iban || 'SA4480000000000000000000'}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 4: LEAVE DETAILS & HISTORY (21 DAYS AUDIT)
          ═══════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'leave_details' || activeTab === 'leave_history') && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-teal-600" />
                    <span>رصيد الإجازات السنوية وسجل الطلبات (21 يوماً)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">الرصيد المتاح، الأيام المستهلكة، وسجل الإجازات المعتمدة</p>
                </div>
                <Button size="sm" onClick={() => setGrantLeaveModal(true)} className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>منح إجازة</span>
                </Button>
              </div>

              {/* Balances Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200">
                  <div className="text-muted-foreground text-[10px] font-bold">الرصيد السنوي المستحق:</div>
                  <div className="text-xl font-mono font-black text-teal-700 dark:text-teal-300 mt-0.5">{totalAnnual} يوم</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="text-muted-foreground text-[10px] font-bold">المستهلك من الإجازات:</div>
                  <div className="text-xl font-mono font-black text-foreground mt-0.5">{usedAnnualDays} يوم</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200">
                  <div className="text-muted-foreground text-[10px] font-bold">الرصيد المتبقي:</div>
                  <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{remAnnual} يوم</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border text-xs">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>نسبة استهلاك رصيد الإجازة السنوية:</span>
                  <span className="font-mono text-teal-600">{pctAnnual}% ({usedAnnualDays}/{totalAnnual} يوم)</span>
                </div>
                <Progress value={pctAnnual} className="h-2 bg-teal-100 [&>div]:bg-teal-600" />
              </div>

              {/* History Table */}
              <div className="space-y-2">
                <h4 className="font-heading font-bold text-xs text-foreground">سجل الإجازات المعتمدة للموظف:</h4>
                {empLeaves.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                    لا توجد إجازات سابقة مسجلة لهذا الموظف.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground font-bold">
                          <th className="py-2 px-2">نوع الإجازة</th>
                          <th className="py-2 px-2">من تاريخ</th>
                          <th className="py-2 px-2">إلى تاريخ</th>
                          <th className="py-2 px-2">عدد الأيام</th>
                          <th className="py-2 px-2">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium">
                        {empLeaves.map((lv, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="py-2.5 px-2 font-bold">{lv.leave_type || 'سنوية'}</td>
                            <td className="py-2.5 px-2 font-mono">{lv.start_date}</td>
                            <td className="py-2.5 px-2 font-mono">{lv.end_date}</td>
                            <td className="py-2.5 px-2 font-mono font-bold text-teal-600">{lv.days_count || 1} يوم</td>
                            <td className="py-2.5 px-2">
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px] font-bold">معتمد ✓</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 5: CUSTODY & ASSETS (العهود والأصول المقيدة)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'custody' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>العهود والأصول المقيدة على الموظف</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">السيارات، الأجهزة، الهواتف، والعهد النقدية المسلمة</p>
                </div>
                <Button size="sm" onClick={() => setAddCustodyModal(true)} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ قيد عهدة جديدة</span>
                </Button>
              </div>

              {custodyList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                  لا توجد عهد مقيدة على الموظف حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {custodyList.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                          {c.type === 'car' ? <Car className="w-5 h-5" /> : (c.type === 'laptop' ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />)}
                        </div>
                        <div>
                          <div className="font-heading font-bold text-foreground text-sm">{c.name}</div>
                          <div className="text-muted-foreground text-[11px] font-mono mt-0.5">
                            الرقم التسلسلي: <strong className="text-slate-800 dark:text-slate-200">{c.serial_number}</strong> • تاريخ التسليم: {c.delivery_date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px]">
                          مسلمة ونشطة ✓
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 6: PENALTIES & REWARDS (الجزاءات والمكافآت)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'penalties' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-purple-600" />
                    <span>سجل الجزاءات الإدارية والمكافآت التقديرية</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">قرارات التميز، خطابات الشكر، والإنذارات الرسمية</p>
                </div>
                <Button size="sm" onClick={() => setAddPenaltyModal(true)} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ تسجيل إجراء</span>
                </Button>
              </div>

              {penaltiesList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                  السجل نظيف — لا توجد جزاءات أو مكافآت مسجلة.
                </div>
              ) : (
                <div className="space-y-3">
                  {penaltiesList.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${p.type === 'reward' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {p.type === 'reward' ? <Award className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-heading font-bold text-foreground text-sm">{p.title}</div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            السبب: {p.reason} • صدر من: {p.issued_by}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {p.amount > 0 && (
                          <div className="font-mono font-black text-emerald-600 text-sm">+{p.amount} ر.س</div>
                        )}
                        <div className="text-muted-foreground font-mono text-[10px]">{p.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 7: DEPENDENTS (التابعين والمرافقين)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'dependents' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-rose-600" />
                    <span>المرافقين والتابعين المشمولين بالتأمين</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">بيانات الزوجة والأبناء المعتمدة في ملف الموظف</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setAddDependentModal(true)} className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة تابع</span>
                  </Button>
                )}
              </div>

              {dependentsList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                  لم يتم إضافة تابعين لهذا الموظف بعد.
                </div>
              ) : (
                <div className="space-y-3">
                  {dependentsList.map((d) => (
                    <div key={d.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-heading font-bold text-foreground text-sm">{d.name}</div>
                          <div className="text-muted-foreground text-[11px] font-mono mt-0.5">
                            صلة القرابة: <strong className="text-foreground">{d.relation}</strong> • رقم الهوية: {d.national_id} • تاريخ الميلاد: {d.birth_date}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-sky-500/10 text-sky-700 border-sky-300 font-bold text-[10px]">{d.medical_insurance}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 8: TRAINING & CERTIFICATES (الدورات التدريبية)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'training' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>سجل الدورات والشهادات المهنية</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">التطوير المهني والبرامج التدريبية المعتمدة</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setAddTrainingModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة دورة</span>
                  </Button>
                )}
              </div>

              {trainingsList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                  لا توجد دورات مسجلة حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingsList.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-heading font-bold text-foreground text-sm">{t.title}</div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            الجهة: {t.provider} • المدة: {t.hours} ساعة • تاريخ الإتمام: {t.completion_date}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px]">{t.score}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 9: EVALUATION & PERFORMANCE (التقييم والأداء)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'evaluation' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>تقييم الأداء ومؤشرات الإنجاز الوظيفي (KPIs)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">نتائج التقييمات الدورية والدرجات المعتمدة من الإدارة</p>
                </div>
                <Button size="sm" onClick={() => setAddEvalModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إجراء تقييم جديد</span>
                </Button>
              </div>

              <div className="space-y-4">
                {evaluationsList.map((e) => (
                  <div key={e.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-heading font-bold text-sm text-foreground">{e.period}</div>
                      <Badge className="bg-emerald-600 text-white font-bold text-[11px]">{e.grade}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">الانضباط: <strong className="text-emerald-600">{e.score_punctuality}%</strong></div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">جودة الأداء: <strong className="text-sky-600">{e.score_performance}%</strong></div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">روح الفريق: <strong className="text-indigo-600">{e.score_teamwork}%</strong></div>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-xl border">
                      ملاحظات المقيم ({e.evaluator}): {e.notes}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 10: ADVANCES & OTHER BALANCES (رصيدي أخرى والسلف)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'other_balances' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>رصيد السلف المالية والأقساط المستحقة</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">متابعة السلف وسندات الصرف المعتمدة واستقطاع المسير</p>
                </div>
                <Button size="sm" onClick={() => navigate('/requests?tab=advances')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ طلب سلفة جديدة</span>
                </Button>
              </div>

              {activeAdvance ? (
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading font-black text-sm text-emerald-950 dark:text-emerald-200">
                        سلفة مالية معتمدة #{activeAdvance.voucher_number || 'VCH-ADV-2026-001'}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        السبب: {activeAdvance.reason || 'سلفة شخصية طارئة'}
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">سارية بالمسير ✓</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border">
                      <div className="text-muted-foreground text-[10px]">إجمالي السلفة:</div>
                      <div className="font-mono font-black text-sm text-foreground mt-0.5">{Number(activeAdvance.total_amount).toLocaleString('en-US')} ر.س</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border">
                      <div className="text-muted-foreground text-[10px]">القسط الشهري:</div>
                      <div className="font-mono font-black text-sm text-rose-600 mt-0.5">{Number(activeAdvance.monthly_installment || Math.round(activeAdvance.total_amount / (activeAdvance.total_installments || 4))).toLocaleString('en-US')} ر.س</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border">
                      <div className="text-muted-foreground text-[10px]">الرصيد المتبقي:</div>
                      <div className="font-mono font-black text-sm text-emerald-600 mt-0.5">{Number(activeAdvance.remaining_balance || activeAdvance.total_amount).toLocaleString('en-US')} ر.س</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAdvanceForVoucher(activeAdvance);
                        setVoucherModalOpen(true);
                      }}
                      className="bg-slate-900 text-white rounded-xl text-xs font-bold gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة سند صرف السلفة A4</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl">
                  لا توجد سلف مالية نشطة على الموظف حالياً.
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 11: TEAM & HIERARCHY (فريق العمل)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'team' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="border-b pb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-sky-600" />
                  <span>فريق العمل وزملاء الفرع</span>
                </h3>
                <p className="text-xs text-muted-foreground">الموظفون المشتركون بنفس الفرع ({employee.branch_name || employee.branch || 'الفرع الرئيسي'})</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {employees.filter(e => (e.branch_name || e.branch) === (employee.branch_name || employee.branch)).map(peer => (
                  <div key={peer.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {peer.full_name?.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-foreground">{peer.full_name}</div>
                      <div className="text-muted-foreground text-[10px] font-mono">#{peer.employee_number} — {peer.job_title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 12: DOCUMENTS & CONTRACTS
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'documents' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <span>المستندات والعقود الرسمية المرفوعة</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">صورة الهوية، عقد العمل، ورخصة القيادة</p>
                </div>
                <Button size="sm" onClick={() => setUploadDocModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-8 gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ رفع مستند</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-foreground">عقد العمل الموثق (منصة قوى)</div>
                      <div className="text-muted-foreground text-[10px]">PDF • 1.2 MB • موثق رسمياً ✓</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-sky-600">معاينة</Button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <IdCard className="w-5 h-5 text-sky-600" />
                    <div>
                      <div className="font-bold text-foreground">صورة الهوية الوطنية / الإقامة</div>
                      <div className="text-muted-foreground text-[10px]">JPG • 450 KB • سارية ✓</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-sky-600">معاينة</Button>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 13: PAYSLIPS (كشوف راتبي)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'payslips' && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="border-b pb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>كشوف الرواتب الشهرية والتحويلات البنكية</span>
                </h3>
                <p className="text-xs text-muted-foreground">تفاصيل الراتب الأساسي والبدلات والاستقطاعات الصافية</p>
              </div>

                            <div className="p-4 rounded-2xl bg-muted/30 border space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground">كشف راتب وباقة بدلات الموظف</span>
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px] me-2">معتمد للصرف ✓</Badge>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setAllowanceForm({
                          housing_allowance: employee.housing_allowance || 0,
                          transport_allowance: employee.transport_allowance || 0,
                          electricity_allowance: employee.electricity_allowance || 0,
                          phone_allowance: employee.phone_allowance || 0,
                          other_allowance: employee.other_allowance || 0,
                          allowance_notes: employee.allowance_notes || ''
                        });
                        setEditAllowancesModal(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-3 shadow-sm"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>تعديل باقة البدلات</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">الأساسي: <strong className="font-mono"><MaskedSalary value={employee.salary} /></strong></div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">بدل السكن: <strong className="font-mono text-sky-700"><MaskedSalary value={employee.housing_allowance || 0} /></strong></div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border">بدل النقل: <strong className="font-mono text-emerald-700"><MaskedSalary value={employee.transport_allowance || 0} /></strong></div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300">إجمالي الراتب: <strong className="font-mono text-emerald-800 font-black"><MaskedSalary value={Number(employee.salary || 0) + Number(employee.housing_allowance || 0) + Number(employee.transport_allowance || 0) + Number(employee.electricity_allowance || 0) + Number(employee.phone_allowance || 0) + Number(employee.other_allowance || 0)} /></strong></div>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 14: NOTIFICATIONS & RECENT ACTIVITY
          ═══════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'notifications' || activeTab === 'activity') && (
            <Card className="p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="border-b pb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>سجل النشاط والتعديلات الإدارية على ملف الموظف</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-muted/30 border flex items-center justify-between">
                  <span className="font-bold">تم توثيق وتحديث بيانات التأمين الطبي والتأمينات الاجتماعية بنجاح</span>
                  <span className="text-muted-foreground font-mono text-[10px]">اليوم 21:00</span>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 border flex items-center justify-between">
                  <span className="font-bold">تسجيل ومطابقة الوردية المعتمدة للموظف مع جدول الورديات</span>
                  <span className="text-muted-foreground font-mono text-[10px]">اليوم 18:30</span>
                </div>
              </div>
            </Card>
          )}

        </div>

      </div>

      {/* ─── MODAL 1: EDIT INSURANCE & GOSI ──────────────────────────────── */}
      <Dialog open={editInsuranceModal} onOpenChange={setEditInsuranceModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>تعديل بيانات التأمين وطريقة الصرف المالي (بنك / كاش)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* 1. GOSI Social Insurance Status Switcher */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>حالة التأمينات الاجتماعية (GOSI)</span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border">
                  <button
                    type="button"
                    onClick={() => setInsuranceForm(prev => ({ ...prev, is_insured: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      insuranceForm.is_insured ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    مؤمن عليه ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsuranceForm(prev => ({ ...prev, is_insured: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      !insuranceForm.is_insured ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    غير مؤمن عليه
                  </button>
                </div>
              </div>

              {insuranceForm.is_insured && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                  <div className="space-y-1">
                    <Label className="font-bold text-[11px]">رقم المشترك بالتأمينات (GOSI):</Label>
                    <Input
                      value={insuranceForm.gosi_number}
                      onChange={(e) => setInsuranceForm(prev => ({ ...prev, gosi_number: e.target.value }))}
                      placeholder="GSI-10042918"
                      className="rounded-xl font-mono text-xs font-bold h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-[11px]">الراتب الخاضع للاشتراك (ر.س):</Label>
                    <Input
                      type="number"
                      value={insuranceForm.insured_salary}
                      onChange={(e) => setInsuranceForm(prev => ({ ...prev, insured_salary: Number(e.target.value) }))}
                      className="rounded-xl font-mono text-xs font-bold h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Payout Split Method (Bank Transfer vs Cash Handout) */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-3">
              <div className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>طريقة استلام وصرف الراتب</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                <button
                  type="button"
                  onClick={() => setInsuranceForm(prev => ({ ...prev, payout_method: 'bank_full' }))}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all ${
                    insuranceForm.payout_method === 'bank_full'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🏦 بنك كامل 100%
                </button>

                <button
                  type="button"
                  onClick={() => setInsuranceForm(prev => ({ ...prev, payout_method: 'split_bank_cash' }))}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all ${
                    insuranceForm.payout_method === 'split_bank_cash'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🔀 بنك جزئي + كاش
                </button>

                <button
                  type="button"
                  onClick={() => setInsuranceForm(prev => ({ ...prev, payout_method: 'cash_full' }))}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all ${
                    insuranceForm.payout_method === 'cash_full'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  💵 كاش كامل 100%
                </button>
              </div>

              {/* Split Breakdown Details */}
              {insuranceForm.payout_method === 'split_bank_cash' && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="font-bold text-[11px]">مبلغ التحويل البنكي (ر.س) *:</Label>
                      <Input
                        type="number"
                        value={insuranceForm.bank_transfer_amount}
                        onChange={(e) => setInsuranceForm(prev => ({ ...prev, bank_transfer_amount: Number(e.target.value) }))}
                        className="rounded-xl font-mono text-xs font-black text-indigo-700 h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold text-[11px]">المتبقي التقريبي كاش (ر.س):</Label>
                      <div className="font-mono font-black text-rose-600 text-sm h-9 flex items-center bg-slate-50 dark:bg-slate-800 px-3 rounded-xl border">
                        {Math.max(0, (Number(employee?.salary) || 0) - (Number(insuranceForm.bank_transfer_amount) || 0)).toLocaleString('en-US')} ر.س
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    سيتم تحويل ({Number(insuranceForm.bank_transfer_amount || 0).toLocaleString('en-US')} ر.س) عبر نظام حماية الأجور بالبنك وتسليم الباقي نقداً بسند استلام.
                  </p>
                </div>
              )}

              {/* Bank & IBAN Fields (Visible if not 100% cash) */}
              {insuranceForm.payout_method !== 'cash_full' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="font-bold text-[11px]">اسم البنك المعتمد:</Label>
                    <Select
                      value={insuranceForm.bank_name}
                      onValueChange={(v) => setInsuranceForm(prev => ({ ...prev, bank_name: v }))}
                    >
                      <SelectTrigger className="rounded-xl font-bold text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="مصرف الراجحي">مصرف الراجحي</SelectItem>
                        <SelectItem value="البنك الأهلي السعودي (SNB)">البنك الأهلي السعودي (SNB)</SelectItem>
                        <SelectItem value="مصرف الإنماء">مصرف الإنماء</SelectItem>
                        <SelectItem value="بنك البلاد">بنك البلاد</SelectItem>
                        <SelectItem value="بنك الرياض">بنك الرياض</SelectItem>
                        <SelectItem value="البنك العربي الوطني (ANB)">البنك العربي الوطني (ANB)</SelectItem>
                        <SelectItem value="بنك الجزيرة">بنك الجزيرة</SelectItem>
                        <SelectItem value="البنك السعودي الفرنسي">البنك السعودي الفرنسي</SelectItem>
                        <SelectItem value="البنك السعودي الأول (SAB)">البنك السعودي الأول (SAB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-[11px]">رقم الآيبان (IBAN):</Label>
                    <Input
                      value={insuranceForm.iban}
                      onChange={(e) => setInsuranceForm(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder="SA4480000000000000000000"
                      className="rounded-xl font-mono text-xs font-bold h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Medical Health Insurance */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-3">
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>وثيقة التأمين الطبي</span>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-[11px]">الشركة المؤمنة:</Label>
                <Select value={insuranceForm.insurance_company} onValueChange={(v) => setInsuranceForm(prev => ({ ...prev, insurance_company: v }))}>
                  <SelectTrigger className="rounded-xl font-bold text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="شركة بوبا العربية للتأمين التعاوني (Bupa)">شركة بوبا العربية للتأمين التعاوني (Bupa)</SelectItem>
                    <SelectItem value="شركة التعاونية للتأمين (Tawuniya)">شركة التعاونية للتأمين (Tawuniya)</SelectItem>
                    <SelectItem value="تكافل الراجحي (Al Rajhi Takaful)">تكافل الراجحي (Al Rajhi Takaful)</SelectItem>
                    <SelectItem value="شركة ميدغلف للتأمين (MedGulf)">شركة ميدغلف للتأمين (MedGulf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">فئة التأمين:</Label>
                  <Select value={insuranceForm.insurance_category} onValueChange={(v) => setInsuranceForm(prev => ({ ...prev, insurance_category: v }))}>
                    <SelectTrigger className="rounded-xl font-bold text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="VIP - الفئة الذهبية الشاملة">VIP - الفئة الذهبية</SelectItem>
                      <SelectItem value="Class A - الفئة الفضية الممتازة">Class A - الفئة الفضية</SelectItem>
                      <SelectItem value="Class B - الفئة المعتمدة">Class B - الفئة المعتمدة</SelectItem>
                      <SelectItem value="بدون تأمين طبي">بدون تأمين طبي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">رقم الوثيقة:</Label>
                  <Input value={insuranceForm.insurance_policy_number} onChange={(e) => setInsuranceForm(prev => ({ ...prev, insurance_policy_number: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-[11px]">تاريخ انتهاء الوثيقة:</Label>
                <Input type="date" value={insuranceForm.insurance_expiry} onChange={(e) => setInsuranceForm(prev => ({ ...prev, insurance_expiry: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditInsuranceModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleSaveInsurance} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتحديث بيانات الموظف سحابياً</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: ADD CUSTODY ASSET ──────────────────────────────────── */}
      <Dialog open={addCustodyModal} onOpenChange={setAddCustodyModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <span>قيد عهدة أو أصل جديد على الموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">اسم ووصف العهدة *:</Label>
              <Input placeholder="مثال: سيارة نيسان صني موديل 2024 لوحة (1234 أ ب ج)" value={custodyForm.name} onChange={(e) => setCustodyForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">نوع العهدة:</Label>
                <Select value={custodyForm.type} onValueChange={(v) => setCustodyForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="rounded-xl text-xs font-bold h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="car">سيارة شركة</SelectItem>
                    <SelectItem value="laptop">جهاز كمبيوتر / لابتوب</SelectItem>
                    <SelectItem value="phone">هاتف جوال / شريحة</SelectItem>
                    <SelectItem value="key">مفاتيح فرع / خزن</SelectItem>
                    <SelectItem value="cash">عهدة مالية نقدية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">الرقم التسلسلي / اللوحة:</Label>
                <Input value={custodyForm.serial_number} onChange={(e) => setCustodyForm(prev => ({ ...prev, serial_number: e.target.value }))} placeholder="SN-12345" className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">ملاحظات والتزامات الاستخدام:</Label>
              <Input value={custodyForm.notes} onChange={(e) => setCustodyForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="ملاحظات العهدة..." className="rounded-xl text-xs h-9" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddCustodyModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleAddCustody} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>قيد العهدة 💾</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: ADD PENALTY / REWARD ───────────────────────────────── */}
      <Dialog open={addPenaltyModal} onOpenChange={setAddPenaltyModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-purple-600" />
              <span>تسجيل مكافأة أو جزاء إداري للموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">نوع الإجراء:</Label>
              <Select value={penaltyForm.type} onValueChange={(v) => setPenaltyForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="rounded-xl text-xs font-bold h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="reward">🌟 مكافأة تميز مالية</SelectItem>
                  <SelectItem value="appreciation">📜 خطاب شكر وتقدير</SelectItem>
                  <SelectItem value="warning">⚠️ لفت نظر / إنذار كتابي</SelectItem>
                  <SelectItem value="deduction">🚫 جزاء خصم إداري</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">عنوان الإجراء *:</Label>
              <Input placeholder="مثال: مكافأة تحقيق مستهدف مبيعات شهر أغسطس" value={penaltyForm.title} onChange={(e) => setPenaltyForm(prev => ({ ...prev, title: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">المبلغ (إن وجد):</Label>
                <Input type="number" value={penaltyForm.amount} onChange={(e) => setPenaltyForm(prev => ({ ...prev, amount: Number(e.target.value) }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">تاريخ الصدور:</Label>
                <Input type="date" value={penaltyForm.date} onChange={(e) => setPenaltyForm(prev => ({ ...prev, date: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">السبب والتفاصيل:</Label>
              <Textarea value={penaltyForm.reason} onChange={(e) => setPenaltyForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="السبب..." className="rounded-xl text-xs h-16 resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddPenaltyModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleAddPenalty} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد الإجراء 📜</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: ADD DEPENDENT ──────────────────────────────────────── */}
      <Dialog open={addDependentModal} onOpenChange={setAddDependentModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-rose-600" />
              <span>إضافة مرافق / تابع في ملف الموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">اسم التابع بالكامل *:</Label>
              <Input placeholder="الاسم الكامل..." value={dependentForm.name} onChange={(e) => setDependentForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">صلة القرابة:</Label>
                <Select value={dependentForm.relation} onValueChange={(v) => setDependentForm(prev => ({ ...prev, relation: v }))}>
                  <SelectTrigger className="rounded-xl text-xs font-bold h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="زوجة">زوجة</SelectItem>
                    <SelectItem value="ابن">ابن</SelectItem>
                    <SelectItem value="ابنة">ابنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">رقم الهوية الوطنية / الإقامة:</Label>
                <Input value={dependentForm.national_id} onChange={(e) => setDependentForm(prev => ({ ...prev, national_id: e.target.value }))} placeholder="10xxxxxxxx" className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">تاريخ الميلاد:</Label>
              <Input type="date" value={dependentForm.birth_date} onChange={(e) => setDependentForm(prev => ({ ...prev, birth_date: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDependentModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleAddDependent} className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>إضافة التابع 👨‍👩‍👧</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: GRANT LEAVE DIRECTLY ───────────────────────────────── */}
      <Dialog open={grantLeaveModal} onOpenChange={setGrantLeaveModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-600" />
              <span>منح واعتماد إجازة للموظف: {employee.full_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 flex justify-between">
              <span>الرصيد السنوي المتاح حالياً:</span>
              <strong className="font-mono text-teal-700 font-bold">{remAnnual} يوماً</strong>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">نوع الإجازة:</Label>
              <Select value={grantLeaveForm.leave_type} onValueChange={(v) => setGrantLeaveForm(prev => ({ ...prev, leave_type: v }))}>
                <SelectTrigger className="rounded-xl text-xs font-bold h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="سنوية">إجازة سنوية (تخصم من رصيد الـ 21 يوماً - مدفوعة)</SelectItem>
                  <SelectItem value="مرضية">إجازة مرضية (بتقرير طبي - مدفوعة)</SelectItem>
                  <SelectItem value="اضطرارية">إجازة اضطرارية (تخصم من الرصيد)</SelectItem>
                  <SelectItem value="بدون راتب">إجازة بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">من تاريخ:</Label>
                <Input type="date" value={grantLeaveForm.start_date} onChange={(e) => setGrantLeaveForm(prev => ({ ...prev, start_date: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">إلى تاريخ:</Label>
                <Input type="date" value={grantLeaveForm.end_date} onChange={(e) => setGrantLeaveForm(prev => ({ ...prev, end_date: e.target.value }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">سبب الإجازة والملاحظات:</Label>
              <Input value={grantLeaveForm.reason} onChange={(e) => setGrantLeaveForm(prev => ({ ...prev, reason: e.target.value }))} className="rounded-xl text-xs h-9" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGrantLeaveModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleGrantLeave} className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد ومنح الإجازة 🏖️</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 6: UPLOAD DOCUMENT ────────────────────────────────────── */}
      <Dialog open={uploadDocModal} onOpenChange={setUploadDocModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <span>رفع مستند رسمي للموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">نوع المستند:</Label>
              <Select value={docForm.type} onValueChange={(v) => setDocForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="rounded-xl text-xs font-bold h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="contract">عقد العمل الموثق</SelectItem>
                  <SelectItem value="id">الهوية الوطنية / الإقامة</SelectItem>
                  <SelectItem value="license">رخصة القيادة</SelectItem>
                  <SelectItem value="certificate">شهادة دراسية / مهنية</SelectItem>
                  <SelectItem value="other">مستند رسمي آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">اسم المستند:</Label>
              <Input placeholder="مثال: عقد العمل 2026" value={docForm.name} onChange={(e) => setDocForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Upload className="w-8 h-8 mx-auto text-indigo-600 opacity-80" />
              <div className="font-bold text-xs">اختر الملف من جهازك (PDF, PNG, JPG)</div>
              <Input type="file" className="text-xs" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUploadDocModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={() => { setUploadDocModal(false); toast({ title: '✓ تم رفع وتوثيق المستند في ملف الموظف السحابي بنجاح' }); }} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ المستند 📁</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      {/* ─── MODAL 8: EDIT EMPLOYEE COMPREHENSIVE MODAL ────────────────── */}
      {editEmployeeModal && (
        <EmployeeForm
          open={editEmployeeModal}
          onOpenChange={setEditEmployeeModal}
          employee={employee}
          onSaved={(updated) => {
            setEmployee(updated);
            setEditEmployeeModal(false);
            toast({
              title: '✓ تم تحديث بيانات الموظف بنجاح',
              description: `تم حفظ التعديلات للموظف ${updated?.full_name || employee?.full_name}.`
            });
          }}
        />
      )}

      {/* ─── MODAL 7: A4 ADVANCE DISBURSEMENT VOUCHER PRINT MODAL ─────────── */}
      {selectedAdvanceForVoucher && (
        <AdvanceVoucherA4Modal
          open={voucherModalOpen}
          onOpenChange={setVoucherModalOpen}
          advance={selectedAdvanceForVoucher}
          employee={employee}
        />
      )}

    </div>
  );
}
