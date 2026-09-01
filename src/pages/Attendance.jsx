import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Fingerprint,
  Search,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Printer
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Attendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isManagerOrAdmin = user?.role === 'owner' || user?.role === 'accountant' || user?.role === 'hr' || user?.role === 'system_admin' || user?.role === 'admin';

  // Filter mode: 'today' | 'yesterday' | 'range'
  const [filterMode, setFilterMode] = useState('today');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Checkboxes
  const [selectedRows, setSelectedRows] = useState([]);
  const [manualPunchOpen, setManualPunchOpen] = useState(() => searchParams.get('mode') === 'manual');
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    log_date: todayStr(),
    status: 'present',
    // Single Shift Punches
    check_in: '16:00',
    check_out: '21:00',
    // Dual / Multi Shift Punches (4 punches)
    period_1_in: '09:00',
    period_1_out: '13:00',
    period_2_in: '16:00',
    period_2_out: '21:00'
  });

  // Automatically adapt defaults when employee is selected
  const handleSelectEmployeeForPunch = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId) || String(e.employee_number) === String(empId));
    const empShift = emp?.shift || '';
    
    if (empShift.includes('9 ساعات') || emp?.employee_number === '1022' || emp?.employee_number === '1005') {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        period_1_in: '09:00',
        period_1_out: '13:00',
        period_2_in: '16:00',
        period_2_out: '21:00',
        check_in: '09:00',
        check_out: '21:00'
      }));
    } else if (empShift.includes('غير سعودي') || empShift.includes('8 ساعات') || (emp?.nationality !== 'سعودي' && emp?.employee_number !== '1001')) {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        period_1_in: '08:00',
        period_1_out: '12:00',
        period_2_in: '16:00',
        period_2_out: '20:00',
        check_in: '08:00',
        check_out: '20:00'
      }));
    } else if (empShift.includes('مسائي')) {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        check_in: '16:00',
        check_out: '21:00',
        period_1_in: '16:00',
        period_1_out: '21:00',
        period_2_in: '',
        period_2_out: ''
      }));
    } else if (empShift.includes('صباحي')) {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        check_in: '08:00',
        check_out: '13:00',
        period_1_in: '08:00',
        period_1_out: '13:00',
        period_2_in: '',
        period_2_out: ''
      }));
    } else {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        check_in: '09:00',
        check_out: '17:00'
      }));
    }
  };

  // Modals
  const [editLogModal, setEditLogModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sList, emps, logs] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 2000),
      ]);
      setShifts(sList || []);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
    } catch (e) {
      console.error('Error loading biometrics:', e);
      toast({ title: 'خطأ في تحميل سجلات البصمات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('mode') === 'manual') {
      setManualPunchOpen(true);
    }
  }, [searchParams]);

  // Set date filter when filterMode changes
  useEffect(() => {
    if (filterMode === 'today') {
      setStartDate(todayStr());
      setEndDate(todayStr());
    } else if (filterMode === 'yesterday') {
      setStartDate(yesterdayStr());
      setEndDate(yesterdayStr());
    }
  }, [filterMode]);

  // Employee mapping lookup
  const empMap = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      map[String(e.employee_number || e.id)] = e;
      map[e.full_name] = e;
    });
    return map;
  }, [employees]);

  // Flatten biometric punch logs into discrete punch timestamps (Ektefa Table Spec)
  const flattenedPunches = useMemo(() => {
    const list = [];
    attendanceLogs.forEach(log => {
      // Date filter
      if (log.log_date < startDate || log.log_date > endDate) return;

      const emp = empMap[String(log.employee_number)] || empMap[log.employee_name] || {};
      const branchName = emp.branch_name || emp.branch || 'الفرع الرئيسي';
      const deptName = emp.department_name || 'درة السيارة لقطع الغيار';
      
      // Determine device serial based on branch
      let deviceSource = '.1 EK0201000043';
      if (branchName.includes('إدارة')) deviceSource = '.2 EK0201000044';
      if (branchName.includes('هونداي')) deviceSource = '.3 EK0201000045';
      if (branchName.includes('كيا')) deviceSource = '.2 EK0201000044';

      // Check-in punch
      if (log.check_in) {
        list.push({
          id: `${log.id}_in`,
          logId: log.id,
          employee_name: log.employee_name || emp.full_name || 'موظف',
          employee_number: log.employee_number || emp.employee_number || '1001',
          branch_name: branchName,
          department_name: deptName,
          device_source: deviceSource,
          timestamp_raw: log.check_in,
          timestamp_display: log.check_in.includes('T') ? `${log.check_in.slice(11, 16)} ${log.log_date}` : `${log.check_in} ${log.log_date}`,
          inserted_at: `${log.check_in.includes('T') ? log.check_in.slice(11, 16) : '08:00'} ${log.log_date}`,
          punch_type: 'دخول'
        });
      }

      // Check-out punch
      if (log.check_out) {
        list.push({
          id: `${log.id}_out`,
          logId: log.id,
          employee_name: log.employee_name || emp.full_name || 'موظف',
          employee_number: log.employee_number || emp.employee_number || '1001',
          branch_name: branchName,
          department_name: deptName,
          device_source: deviceSource,
          timestamp_raw: log.check_out,
          timestamp_display: log.check_out.includes('T') ? `${log.check_out.slice(11, 16)} ${log.log_date}` : `${log.check_out} ${log.log_date}`,
          inserted_at: `${log.check_out.includes('T') ? log.check_out.slice(11, 16) : '17:00'} ${log.log_date}`,
          punch_type: 'خروج'
        });
      }
    });

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp_raw.localeCompare(a.timestamp_raw));
  }, [attendanceLogs, startDate, endDate, empMap]);

  // Filtered by Search & Branch
  const filteredPunches = useMemo(() => {
    return flattenedPunches.filter(p => {
      const matchSearch = !searchEmployee ||
        p.employee_name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        p.employee_number.toString().includes(searchEmployee);
      const matchBranch = selectedBranch === 'all' || p.branch_name === selectedBranch;
      return matchSearch && matchBranch;
    });
  }, [flattenedPunches, searchEmployee, selectedBranch]);

  // Branches list
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Export CSV
  const exportCSV = () => {
    if (filteredPunches.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    const headers = ['الموظف', 'الرقم الوظيفي', 'الفرع', 'الإدارة', 'المصدر', 'الطابع الزمني', 'التاريخ المدرج'];
    const rows = filteredPunches.map(p => [
      p.employee_name,
      p.employee_number,
      p.branch_name,
      p.department_name,
      p.device_source,
      p.timestamp_display,
      p.inserted_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `بصمات_الدوام_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: '✓ تم تصدير ملف البصمات بنجاح' });
  };

  const handleCreateManualPunch = async () => {
    if (!manualForm.employee_id || !manualForm.log_date) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى اختيار الموظف والتاريخ.', variant: 'destructive' });
      return;
    }

    const isHrAdmin = !user?.role || user?.role === 'admin' || user?.job_title?.includes('موارد') || user?.job_title?.includes('مدير') || user?.employee_number === '1001' || user?.employee_number === '1022';
    if (!isHrAdmin) {
      toast({ title: 'غير مصرح ⚠️', description: 'تسجيل البصمات اليدوية مخصص فقط لمدير الموارد البشرية.', variant: 'destructive' });
      return;
    }

    try {
      const emp = employees.find(e => String(e.id) === String(manualForm.employee_id) || String(e.employee_number) === String(manualForm.employee_id));
      const empId = emp ? emp.id : manualForm.employee_id;
      const empNum = emp ? String(emp.employee_number) : '';
      const empName = emp ? emp.full_name : 'موظف';
      const empShift = emp?.shift || '';

      const isSplitShift = empShift.includes('فترتين') || 
        empShift.includes('غير سعودي') || 
        empShift.includes('9 ساعات') || 
        empShift.includes('8 ساعات') || 
        (emp?.nationality !== 'سعودي' && emp?.employee_number !== '1001');

      const parseM = (t) => {
        if (!t) return null;
        const clean = t.replace(/[^0-9:]/g, '');
        const p = clean.split(':');
        return p.length >= 2 ? (parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) : null;
      };

      let totalHrs = 0;
      let rawPunches = '';
      let checkInFinal = null;
      let checkOutFinal = null;

      if (isSplitShift) {
        // Calculate both morning and evening shifts
        const m1In = parseM(manualForm.period_1_in);
        const m1Out = parseM(manualForm.period_1_out);
        const m2In = parseM(manualForm.period_2_in);
        const m2Out = parseM(manualForm.period_2_out);

        let dur1 = 0;
        if (m1In !== null && m1Out !== null) {
          dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
        }
        let dur2 = 0;
        if (m2In !== null && m2Out !== null) {
          dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
        }
        totalHrs = Math.round(((dur1 + dur2) / 60) * 10) / 10;
        rawPunches = `${manualForm.period_1_in || '09:00'}:00 -- ${manualForm.period_1_out || '13:00'}:00 & ${manualForm.period_2_in || '16:00'}:00 -- ${manualForm.period_2_out || '21:00'}:00`;
        checkInFinal = manualForm.period_1_in ? `${manualForm.log_date}T${manualForm.period_1_in}:00` : null;
        checkOutFinal = manualForm.period_2_out ? `${manualForm.log_date}T${manualForm.period_2_out}:00` : null;
      } else {
        const inM = parseM(manualForm.check_in);
        const outM = parseM(manualForm.check_out);
        if (inM !== null && outM !== null) {
          const diff = outM >= inM ? outM - inM : (outM + 1440) - inM;
          totalHrs = Math.round((diff / 60) * 10) / 10;
        }
        rawPunches = `${manualForm.check_in || '16:00'}:00 -- ${manualForm.check_out || '21:00'}:00`;
        checkInFinal = manualForm.check_in ? `${manualForm.log_date}T${manualForm.check_in}:00` : null;
        checkOutFinal = manualForm.check_out ? `${manualForm.log_date}T${manualForm.check_out}:00` : null;
      }

      const logPayload = {
        id: 'att_man_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        employee_id: empId,
        user_id: empId,
        employee_name: empName,
        employee_number: empNum,
        log_date: manualForm.log_date,
        check_in: checkInFinal,
        check_out: checkOutFinal,
        status: manualForm.status || 'present',
        timestamp_raw: rawPunches,
        total_hours: totalHrs,
        period_1_in: isSplitShift ? manualForm.period_1_in : manualForm.check_in,
        period_1_out: isSplitShift ? manualForm.period_1_out : manualForm.check_out,
        period_2_in: isSplitShift ? manualForm.period_2_in : '',
        period_2_out: isSplitShift ? manualForm.period_2_out : '',
        notes: JSON.stringify({
          employee_number: empNum,
          user_id: empId,
          total_hours: totalHrs,
          timestamp_raw: rawPunches,
          shift_name: empShift,
          period_1_in: isSplitShift ? manualForm.period_1_in : manualForm.check_in,
          period_1_out: isSplitShift ? manualForm.period_1_out : manualForm.check_out,
          period_2_in: isSplitShift ? manualForm.period_2_in : '',
          period_2_out: isSplitShift ? manualForm.period_2_out : '',
          manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
          manual_edit_at: new Date().toISOString()
        })
      };

      await base44.entities.AttendanceLog.create(logPayload);
      setAttendanceLogs(prev => [logPayload, ...prev]);

      toast({ 
        title: '✓ تم تسجيل البصمات الأربعة واعتمادها بنجاح', 
        description: `تم توثيق بصمات اليوم بالكامل (${totalHrs} ساعات) للموظف ${empName} وحفظها في السحابة.` 
      });

      setManualPunchOpen(false);
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء تسجيل البصمة', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeletePunch = async (punch) => {
    if (!confirm(`هل أنت متأكد من حذف بصمة ${punch.employee_name}?`)) return;
    try {
      await base44.entities.AttendanceLog.delete(punch.logId);
      toast({ title: '✓ تم حذف البصمة بنجاح' });
      loadData();
    } catch (e) {
      toast({ title: 'خطأ في الحذف', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP HEADER & TITLE (EKTEFA EXACT SPEC) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-sky-600" />
            إدارة البصمات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            مركز تدقيق ومراقبة حركات الدخول والخروج من أجهزة البصمة المربوطة سحابياً
          </p>
        </div>

        {/* Time Filters Bar (اليوم • الأمس • الفترة الزمنية) */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-border/80 p-1.5 rounded-2xl shadow-sm">
          <Button
            size="sm"
            variant={filterMode === 'today' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('today')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'today' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            اليوم
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'yesterday' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('yesterday')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'yesterday' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            الأمس
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'range' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('range')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'range' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            الفترة الزمنية
          </Button>
        </div>
      </div>

      {/* Date Range Inputs if 'range' is selected */}
      {filterMode === 'range' && (
        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground">من تاريخ:</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-8 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground">إلى تاريخ:</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-8 font-mono" />
          </div>
        </Card>
      )}

      {/* ─── 2. SEARCH & ACTION TOOLBAR (EKTEFA SPEC) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-sm">
        
        {/* Left Actions: Manual Punch & Export Data */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setManualPunchOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2 h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ تسجيل بصمة يدوية للموظف</span>
          </Button>

          <Button
            onClick={exportCSV}
            variant="outline"
            className="rounded-xl text-xs font-bold gap-2 h-9 border-border/80 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>تصدير البيانات</span>
          </Button>
        </div>

        {/* Right Search Input & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-44 rounded-xl text-xs h-9 bg-background">
              <SelectValue placeholder="كافة الفروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
              {branches.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Employee Search with Cyan Blue Button */}
          <div className="relative flex items-center">
            <Input
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              placeholder="اسم الموظف أو رقمه..."
              className="rounded-xl text-xs h-9 pe-9 ps-3 w-56 bg-background"
            />
            <div className="absolute end-1 w-7 h-7 bg-sky-500 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-sm">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

      </div>

      {/* ─── 3. BIOMETRICS LOG TABLE (CYAN HEADER - EKTEFA EXACT SPEC) ──────── */}
      <Card className="rounded-3xl border shadow-md overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
            <thead>
              <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded text-sky-600 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRows(filteredPunches.map(p => p.id));
                      else setSelectedRows([]);
                    }}
                    checked={selectedRows.length > 0 && selectedRows.length === filteredPunches.length}
                  />
                </th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-3">الفرع</th>
                <th className="py-3 px-3">الإدارة</th>
                <th className="py-3 px-3">المصدر</th>
                <th className="py-3 px-3">الطابع الزمني</th>
                <th className="py-3 px-3">التاريخ المدرج</th>
                <th className="py-3 px-4 text-center">الخيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                    جاري سحب وتدقيق بصمات الأجهزة السحابية...
                  </td>
                </tr>
              ) : filteredPunches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                    لا توجد بصمات مسجلة في التاريخ المحدد ({startDate}).
                  </td>
                </tr>
              ) : (
                filteredPunches.map((punch, idx) => (
                  <tr
                    key={punch.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(punch.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRows(prev => [...prev, punch.id]);
                          else setSelectedRows(prev => prev.filter(i => i !== punch.id));
                        }}
                        className="rounded text-sky-600 cursor-pointer"
                      />
                    </td>

                    {/* Employee Name & Number */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground text-xs">{punch.employee_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {punch.employee_number}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 text-foreground font-medium">{punch.branch_name}</td>

                    {/* Department */}
                    <td className="py-3 px-3 text-muted-foreground">{punch.department_name}</td>

                    {/* Device Source */}
                    <td className="py-3 px-3">
                      <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded-md font-bold">
                        {punch.device_source}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {punch.timestamp_display}
                    </td>

                    {/* Inserted At */}
                    <td className="py-3 px-3 font-mono text-muted-foreground text-xs">
                      {punch.inserted_at}
                    </td>

                    {/* Options / Actions (Red Trash Can) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeletePunch(punch)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          title="حذف البصمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── MODAL: MANUAL PUNCH REGISTRATION (HR ADMIN) ────────────────── */}
      <Dialog open={manualPunchOpen} onOpenChange={setManualPunchOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Fingerprint className="w-4 h-4" />
              </div>
              <span>تسجيل وتوثيق بصمات اليوم للموظف (صلاحية HR Admin)</span>
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const selectedEmp = employees.find(e => String(e.id) === String(manualForm.employee_id) || String(e.employee_number) === String(manualForm.employee_id));
            const empShift = selectedEmp?.shift || '';
            const isSplitShift = empShift.includes('فترتين') || 
              empShift.includes('غير سعودي') || 
              empShift.includes('9 ساعات') || 
              empShift.includes('8 ساعات') || 
              (selectedEmp && selectedEmp.nationality !== 'سعودي' && selectedEmp.employee_number !== '1001');

            return (
              <div className="space-y-4 py-2 text-xs">
                
                {/* 1. Select Employee & Date */}
                <div className="space-y-1">
                  <Label className="font-bold">اختر الموظف المستهدف *:</Label>
                  <Select 
                    value={manualForm.employee_id} 
                    onValueChange={handleSelectEmployeeForPunch}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                      <SelectValue placeholder="اختر الموظف لتسجيل بصماته..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-60">
                      {employees.map(e => (
                        <SelectItem key={e.id} value={String(e.id)} className="text-xs font-bold py-2">
                          {e.full_name} (#{e.employee_number}) — {e.shift || 'فترة عمل'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shift Info Banner */}
                {selectedEmp && (
                  <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sky-900 dark:text-sky-200">الوردية المعتمدة: </span>
                      <span className="font-bold text-sky-700 dark:text-sky-300">{empShift || 'فترة عمل'}</span>
                    </div>
                    <Badge className="bg-sky-600 text-white font-bold text-[10px]">
                      {isSplitShift ? 'دوام فترتين (4 بصمات)' : 'دوام فترة واحدة (بصمتين)'}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-bold">تاريخ البصمة *:</Label>
                    <Input 
                      type="date" 
                      value={manualForm.log_date} 
                      onChange={(e) => setManualForm(prev => ({ ...prev, log_date: e.target.value }))}
                      className="rounded-xl font-mono text-xs h-9 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold">الحالة المعتمدة:</Label>
                    <Select 
                      value={manualForm.status} 
                      onValueChange={(v) => setManualForm(prev => ({ ...prev, status: v }))}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="present">✓ حاضر (دوام منضبط مكتمل)</SelectItem>
                        <SelectItem value="late">⏰ متأخر (مع احتساب التأخير)</SelectItem>
                        <SelectItem value="annual_leave">🏖️ إجازة سنوية (تخصم من رصيد الإجازات - مدفوعة)</SelectItem>
                        <SelectItem value="sick_leave">🏥 إجازة مرضية (بتقرير طبي - مدفوعة)</SelectItem>
                        <SelectItem value="emergency_leave">⚠️ إجازة اضطرارية (تخصم من الرصيد)</SelectItem>
                        <SelectItem value="unpaid_leave">⏳ إجازة بدون راتب (خصم من الراتب)</SelectItem>
                        <SelectItem value="unexcused_absence">🚫 غياب بدون إذن (خصم يوم كامل)</SelectItem>
                        <SelectItem value="exempt">✨ معفى إدارياً / عطلة رسمية</SelectItem>
                        <SelectItem value="absent">غائب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 2. Biometric Punches Input based on Shift Type */}
                {isSplitShift ? (
                  /* ─── 4 PUNCHES (DUAL SHIFT) ──────────────────────────────────── */
                  <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/80">
                    <div className="flex items-center justify-between font-bold text-xs text-foreground">
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <Sun className="w-4 h-4" />
                        <span>بصمات الفترة الصباحية:</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">الفترة 1</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold">1. دخول صباحي (Check In 1)</Label>
                        <Input 
                          type="time" 
                          value={manualForm.period_1_in} 
                          onChange={(e) => setManualForm(prev => ({ ...prev, period_1_in: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold">2. خروج صباحي (Check Out 1)</Label>
                        <Input 
                          type="time" 
                          value={manualForm.period_1_out} 
                          onChange={(e) => setManualForm(prev => ({ ...prev, period_1_out: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                        />
                      </div>
                    </div>

                    {/* Break indicator */}
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        <span>فترة الاستراحة الرسمية (البريك)</span>
                      </span>
                      <span className="font-mono font-bold" dir="ltr">1:00 PM - 4:00 PM</span>
                    </div>

                    <div className="flex items-center justify-between font-bold text-xs text-foreground pt-1">
                      <span className="flex items-center gap-1.5 text-indigo-600">
                        <Moon className="w-4 h-4" />
                        <span>بصمات الفترة المسائية:</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">الفترة 2</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold">3. دخول مسائي (Check In 2)</Label>
                        <Input 
                          type="time" 
                          value={manualForm.period_2_in} 
                          onChange={(e) => setManualForm(prev => ({ ...prev, period_2_in: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold">4. خروج مسائي (Check Out 2)</Label>
                        <Input 
                          type="time" 
                          value={manualForm.period_2_out} 
                          onChange={(e) => setManualForm(prev => ({ ...prev, period_2_out: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── 2 PUNCHES (SINGLE SHIFT) ─────────────────────────────────── */
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-border/80">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>1. وقت الحضور (Check In):</span>
                      </Label>
                      <Input 
                        type="time" 
                        value={manualForm.check_in} 
                        onChange={(e) => setManualForm(prev => ({ ...prev, check_in: e.target.value }))}
                        className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>2. وقت الانصراف (Check Out):</span>
                      </Label>
                      <Input 
                        type="time" 
                        value={manualForm.check_out} 
                        onChange={(e) => setManualForm(prev => ({ ...prev, check_out: e.target.value }))}
                        className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setManualPunchOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateManualPunch} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتوثيق بصمات اليوم 💾</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
