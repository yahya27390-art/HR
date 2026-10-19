import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { AuthenticatedEventSource } from '@/lib/AuthenticatedEventSource';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { sanitizeCsvRow } from '@/lib/security';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { syncCloudAttendanceLogs, syncAttendanceNow, readCloudAttendancePunches } from '@/lib/biometricDevices';
import { isSpecializedRole } from '@/components/DashboardViewSwitcherBar';
import { parseRawPunchesToPeriods } from '@/lib/payrollEngine';
import {
  Clock,
  Sun,
  Moon,
  Coffee,
  Fingerprint,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  RotateCw,
  Plus
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const clean = timeStr.replace(/[^0-9:]/g, '');
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
}

export function getShiftSchedule(emp) {
  const shift = (emp?.shift || '').toLowerCase();
  const empNum = String(emp?.employee_number || '');

  // 1. Non-Saudi Overtime 9h (09:00 - 13:00 / 16:30 - 21:00)
  if (shift.includes('9 ساعات') || shift.includes('إضافي 100') || empNum === '1022') {
    return {
      isSplit: true,
      shiftName: 'فترة عمل مقيم (9 ساعات)',
      p1In: '09:00',
      p1Out: '13:00',
      breakTime: '1:00 PM - 4:00 PM',
      p2In: '16:30',
      p2Out: '21:00',
      p1InLabel: '1. دخول صباحي (Check In 1)',
      p1OutLabel: '2. خروج صباحي (Check Out 1)',
      p2InLabel: '3. دخول مسائي (Check In 2)',
      p2OutLabel: '4. خروج مسائي (Check Out 2)'
    };
  }

  // 2. Base Non-Saudi 8h (08:00 - 12:00 / 16:00 - 20:00)
  if (shift.includes('غير سعودي') || shift.includes('8 ساعات') || (emp && emp.nationality !== 'سعودي' && empNum !== '1001')) {
    return {
      isSplit: true,
      shiftName: 'فترة عمل مقيم (8 ساعات)',
      p1In: '08:00',
      p1Out: '12:00',
      breakTime: '12:00 PM - 4:00 PM',
      p2In: '16:00',
      p2Out: '20:00',
      p1InLabel: '1. دخول صباحي (Check In 1)',
      p1OutLabel: '2. خروج صباحي (Check Out 1)',
      p2InLabel: '3. دخول مسائي (Check In 2)',
      p2OutLabel: '4. خروج مسائي (Check Out 2)'
    };
  }

  // 3. Saudi Single Evening (16:00 - 21:00)
  if (shift.includes('مسائي') && !shift.includes('غير')) {
    return {
      isSplit: false,
      shiftName: 'دوام مسائي (فترة واحدة)',
      singleIn: '16:00',
      singleOut: '21:00',
      singleInLabel: 'دخول مسائي (Check In)',
      singleOutLabel: 'خروج مسائي (Check Out)'
    };
  }

  // 4. Saudi Single Morning (08:00 - 13:00)
  if (shift.includes('صباحي') || (shift.includes('سعودي') && !shift.includes('مسائي') && !shift.includes('غير'))) {
    return {
      isSplit: false,
      shiftName: 'دوام صباحي (فترة واحدة)',
      singleIn: '08:00',
      singleOut: '13:00',
      singleInLabel: 'دخول صباحي (Check In)',
      singleOutLabel: 'خروج صباحي (Check Out)'
    };
  }

  // 5. General / Administration (09:00 - 17:00)
  return {
    isSplit: false,
    shiftName: emp?.shift || 'دوام إدارة (فترة واحدة)',
    singleIn: '09:00',
    singleOut: '17:00',
    singleInLabel: 'وقت الحضور (Check In)',
    singleOutLabel: 'وقت الانصراف (Check Out)'
  };
}

export default function Attendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  // Synchronized view mode state (specialized admin vs employee mode)
  const [currentViewMode, setCurrentViewMode] = useState(() => {
    if (user?.id) {
      return localStorage.getItem('hr_dashboard_view_mode_' + user.id) || 'specialized';
    }
    return 'specialized';
  });

  useEffect(() => {
    const handleModeChange = (e) => {
      if (e.detail?.mode) {
        setCurrentViewMode(e.detail.mode);
      }
    };
    window.addEventListener('hr_view_mode_changed', handleModeChange);
    return () => window.removeEventListener('hr_view_mode_changed', handleModeChange);
  }, []);

  const isEmployeeDashboardMode = currentViewMode === 'employee';
  const isPersonalQuery = searchParams.get('view') === 'personal';

  const isManagerOrAdmin = useMemo(() => {
    // When using "لوحة الموظف" (Employee Dashboard Mode), managers act 100% as ordinary employees!
    if (isEmployeeDashboardMode) return false;
    return isSpecializedRole(user?.role) || user?.email?.includes('yahya') || user?.email?.includes('dortal') || user?.role === 'hr' || user?.role === 'admin' || user?.role === 'owner' || user?.role === 'system_admin';
  }, [user, isEmployeeDashboardMode]);

  // Filter mode: 'all' | 'today' | 'yesterday' | 'range'
  const [filterMode, setFilterMode] = useState('all');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState(todayStr());
  
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);

  // View mode switcher: 'company' (all employees) vs 'personal' (only personal punches)
  const [reportViewMode, setReportViewMode] = useState(() => {
    if (isPersonalQuery || isEmployeeDashboardMode) return 'personal';
    return isManagerOrAdmin ? 'company' : 'personal';
  });

  useEffect(() => {
    if (isPersonalQuery || isEmployeeDashboardMode) {
      setReportViewMode('personal');
    }
  }, [isPersonalQuery, isEmployeeDashboardMode]);

  const isShowingPersonalOnly = !isManagerOrAdmin || reportViewMode === 'personal';

  // Selected Checkboxes
  const [selectedRows, setSelectedRows] = useState([]);
  const [manualPunchOpen, setManualPunchOpen] = useState(() => isManagerOrAdmin && searchParams.get('mode') === 'manual');
  
  // Selected punches checkboxes (only checked punch times appear and are registered)
  const [selectedPunches, setSelectedPunches] = useState({
    p1_in: false,
    p1_out: false,
    p2_in: false,
    p2_out: false,
    single_in: false,
    single_out: false
  });

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
    period_2_in: '16:30',
    period_2_out: '21:00'
  });

  // Automatically adapt defaults when employee is selected
  const handleSelectEmployeeForPunch = useCallback((empId) => {
    const emp = employees.find(e => String(e.id) === String(empId) || String(e.employee_number) === String(empId));
    const sched = getShiftSchedule(emp);
    
    if (sched.isSplit) {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        period_1_in: sched.p1In,
        period_1_out: sched.p1Out,
        period_2_in: sched.p2In,
        period_2_out: sched.p2Out,
        check_in: sched.p1In,
        check_out: sched.p2Out
      }));
    } else {
      setManualForm(prev => ({
        ...prev,
        employee_id: empId,
        check_in: sched.singleIn,
        check_out: sched.singleOut,
        period_1_in: sched.singleIn,
        period_1_out: sched.singleOut,
        period_2_in: '',
        period_2_out: ''
      }));
    }

    // Reset punch checkboxes so admin can check the specific punch to add
    setSelectedPunches({
      p1_in: false,
      p1_out: false,
      p2_in: false,
      p2_out: false,
      single_in: false,
      single_out: false
    });
  }, [employees]);

  // Auto-select first employee if none selected when modal opens
  useEffect(() => {
    if (manualPunchOpen && !manualForm.employee_id && employees.length > 0) {
      handleSelectEmployeeForPunch(String(employees[0].id));
    }
  }, [manualPunchOpen, manualForm.employee_id, employees, handleSelectEmployeeForPunch]);

  // Modals & Raw Live Cloud Hardware Punches
  const [editLogModal, setEditLogModal] = useState(null);
  const CACHE_KEY_PUNCHES = 'dorat_latest_live_punches';
  const [rawCloudPunches, setRawCloudPunches] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PUNCHES);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const saveAndSetPunches = useCallback((updater) => {
    setRawCloudPunches(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (Array.isArray(next) && next.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY_PUNCHES, JSON.stringify(next.slice(-500)));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Initial Load: Fetch attendance records
      const [sList, emps, logs] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', Infinity),
      ]);
      setShifts(sList || []);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);

      // 2. Fetch recent live hardware punches from local or cloud ADMS endpoint
      try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const liveUrls = [
          ...(isLocal ? [
            'http://127.0.0.1:8080/api/attendance/live?limit=500',
            'http://127.0.0.1:8080/api/attendance/sync.php'
          ] : []),
          'https://adms.doracar.com/api/attendance/live?limit=500',
          'https://adms.doracar.com/api/attendance/sync.php',
          'https://hr.doracar.com/api/attendance/sync.php',
          '/api/attendance/sync.php',
          'https://doracar.com/api/attendance/sync.php'
        ];

        for (const liveUrl of liveUrls) {
          try {
            const resp = await authenticatedFetch(liveUrl, { signal: AbortSignal.timeout(3000) });
            if (resp.ok) {
              const text = await resp.text();
              if (text.startsWith('{')) {
                const data = JSON.parse(text);
                if (data && Array.isArray(data.punches) && data.punches.length > 0) {
                  saveAndSetPunches(prev => {
                    const map = new Map();
                    (prev || []).forEach(p => map.set(`${p.enrollid || p.user_id}_${p.time || p.timestamp}`, p));
                    data.punches.forEach(p => map.set(`${p.enrollid || p.user_id}_${p.time || p.timestamp}`, p));
                    return Array.from(map.values());
                  });
                  break;
                }
              }
            }
          } catch (eU) {}
        }
      } catch (errLive) {
        console.warn('Live endpoint notice:', errLive);
      }

      // 3. Sync Cloud Attendance Logs into local state and refresh AttendanceLog entity
      try {
        const syncRes = await syncCloudAttendanceLogs(emps || []);
        if (syncRes && Array.isArray(syncRes.punches) && syncRes.punches.length > 0) {
          saveAndSetPunches(prev => {
            const map = new Map();
            (prev || []).forEach(p => map.set(`${p.enrollid || p.user_id}_${p.time || p.timestamp}`, p));
            (syncRes.punches || []).forEach(p => map.set(`${p.enrollid || p.user_id}_${p.time || p.timestamp}`, p));
            return Array.from(map.values());
          });
        }
        if (syncRes && syncRes.importedCount > 0) {
          const freshLogs = await base44.entities.AttendanceLog.list('-log_date', Infinity);
          setAttendanceLogs(freshLogs || []);
        }
      } catch (eSync) {
        console.warn('Cloud sync fallback notice:', eSync);
      }
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

  // 3. SSE Stream Connection & Real-Time Incremental Updates (Zero Full-Page Reloads)
  useEffect(() => {
    let isMounted = true;
    let eventSource = null;
    const processedEventKeys = new Set();

    const connectSSE = () => {
      try {
        const streamUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://127.0.0.1:8080/api/attendance/stream'
          : 'https://adms.doracar.com/api/attendance/stream';

        eventSource = new AuthenticatedEventSource(streamUrl);

        const onLivePunch = (event) => {
          if (!isMounted) return;
          try {
            const punch = JSON.parse(event.data);
            const pKey = punch.canonical_id || `${punch.sn}_${punch.enrollid}_${punch.time}`;
            if (processedEventKeys.has(pKey)) return;
            processedEventKeys.add(pKey);

            // Incremental state update without reloading table
            setRawCloudPunches(prev => {
              const exists = prev.some(p => (p.canonical_id === pKey) || (p.enrollid === punch.enrollid && p.time === punch.time));
              if (exists) return prev;
              return [punch, ...prev];
            });
          } catch (e) {}
        };
        eventSource.addEventListener('biometric_punch', onLivePunch);
        eventSource.addEventListener('punch', onLivePunch);

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          // Exponential backoff reconnect
          setTimeout(() => {
            if (isMounted) connectSSE();
          }, 6000);
        };
      } catch (err) {}
    };

    connectSSE();

    // Read the same canonical receiver as the global watcher.
    let pollInFlight = false;
    const pollIncremental = async () => {
      if (!isMounted || pollInFlight) return;
      pollInFlight = true;
      try {
          const data = await readCloudAttendancePunches({ signal: AbortSignal.timeout(15000) });
          if (!isMounted) return;
          if (data && Array.isArray(data.punches) && data.punches.length > 0) {
            setRawCloudPunches(prev => {
              const existingKeys = new Set(prev.map(p => `${p.enrollid}_${p.time}`));
              const newPunches = data.punches.filter(p => !existingKeys.has(`${p.enrollid}_${p.time}`));
              if (newPunches.length === 0) return prev;
              return [...newPunches, ...prev];
            });
          }
      } catch (e) {}
      finally { pollInFlight = false; }
    };

    const pollInterval = setInterval(pollIncremental, 15000);

    const handleInstantLivePunch = async (event) => {
      try {
        const detail = event.detail;
        if (Array.isArray(detail?.syncedLogs)) {
          setAttendanceLogs(prev => {
            const merged = new Map(prev.map(log => [log.id, log]));
            detail.syncedLogs.forEach(log => merged.set(log.id, log));
            return Array.from(merged.values());
          });
        }
        await pollIncremental();
      } catch (err) {}
    };

    window.addEventListener('biometric_punch_received', handleInstantLivePunch);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
      window.removeEventListener('biometric_punch_received', handleInstantLivePunch);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('mode') === 'manual') {
      setManualPunchOpen(true);
    }
  }, [searchParams]);

  // Set date filter when filterMode changes
  useEffect(() => {
    if (filterMode === 'all') {
      setStartDate('2026-10-01');
      setEndDate(todayStr());
    } else if (filterMode === 'today') {
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

function normalizeIsoDate(str, fallback) {
  if (!str) return fallback || '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const year = parts[2];
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let month = p0;
      let day = p1;
      if (p0 > 12) {
        day = p0;
        month = p1;
      }
      const maxDays = new Date(Number(year), month, 0).getDate();
      day = Math.min(day, maxDays);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return s;
}

// Classify biometric punch accurately according to the employee's assigned shift
function classifyShiftPunch(timeClean, emp) {
  if (!timeClean) return 'حركة غير محددة';
  const shift = (emp?.shift || '').toLowerCase();
  const hm = timeClean.slice(0, 5);

  // 1. Ramadan Shift (20:30 - 02:00)
  if (shift.includes('رمضان')) {
    if (hm >= '19:00' && hm <= '23:30') return 'دخول (شفت رمضان)';
    return 'خروج (شفت رمضان)';
  }

  // 2. Saudi Single Morning Shift (08:00 - 13:00)
  if (shift.includes('صباحي') || (shift.includes('سعودي') && !shift.includes('مسائي') && !shift.includes('غير'))) {
    if (hm <= '11:00') return 'دخول (صباحي)';
    return 'خروج (صباحي)';
  }

  // 3. Saudi Single Evening Shift (16:00 - 21:00)
  if (shift.includes('مسائي') && !shift.includes('غير')) {
    if (hm <= '18:30') return 'دخول (مسائي)';
    return 'خروج (مسائي)';
  }

  // 4. GM Single Shift (09:00 - 17:00)
  if (shift.includes('مدير') || shift.includes('الادارة') || shift.includes('إدارة')) {
    if (hm <= '13:00') return 'دخول (دوام الإدارة)';
    return 'خروج (دوام الإدارة)';
  }

  // 5. Non-Saudi Overtime 9h (09:00 - 13:00 / 16:00 - 21:00)
  if (shift.includes('9 ساعات') || shift.includes('إضافي 100') || String(emp?.employee_number) === '1022') {
    if (hm < '11:00') return 'دخول (صباحي)';
    if (hm >= '11:00' && hm < '14:30') return 'خروج (صباحي)';
    if (hm >= '14:30' && hm < '18:45') return 'دخول (مسائي)';
    return 'خروج (مسائي)';
  }

  // 6. Base Non-Saudi 8h (08:00 - 12:00 / 16:00 - 20:00)
  if (hm < '10:00') return 'دخول (صباحي)';
  if (hm >= '10:00' && hm < '14:00') return 'خروج (صباحي)';
  if (hm >= '14:00' && hm < '18:00') return 'دخول (مسائي)';
  return 'خروج (مسائي)';
}

  // Flatten biometric punch logs into discrete punch timestamps (Ektefa Table Spec)
  const flattenedPunches = useMemo(() => {
    const list = [];
    const cleanStart = normalizeIsoDate(startDate, '2020-01-01');
    const cleanEnd = normalizeIsoDate(endDate, '2030-12-31');

    let localBlacklist = [];
    try {
      localBlacklist = JSON.parse(localStorage.getItem('dorat_deleted_punches') || '[]');
    } catch(e) {}

    const seenPunchKeys = new Set();

    // 1. Process Direct Live Cloud Hardware Punches (Raw from Terminal via doracar.com)
    (rawCloudPunches || []).forEach(cp => {
      const timeParts = (cp.time || '').split(' ');
      const datePart = normalizeIsoDate(timeParts[0]);
      if (datePart < cleanStart || datePart > cleanEnd) return;

      const timeClean = timeParts[1] ? timeParts[1].substring(0, 5) : '';
      const pin = String(cp.enrollid || '').trim();
      const cleanPin = pin.replace(/^0+/, '');
      const punchKey = `${cleanPin}_${timeClean}`;
      const punchIdKey = cp.id || `cp_${pin}_${datePart}_${timeClean}`;

      if (localBlacklist.includes(punchKey) || localBlacklist.includes(`${pin}_${timeClean}`) || localBlacklist.includes(punchIdKey) || (cp.id && localBlacklist.includes(cp.id))) {
        return;
      }
      seenPunchKeys.add(`${cleanPin}_${datePart}_${timeClean}`);
      seenPunchKeys.add(`${pin}_${datePart}_${timeClean}`);

      const emp = empMap[pin] || empMap[cleanPin] || {};
      const branchName = emp.branch_name || emp.branch || (cp.sn === 'EK0201000044' ? 'فرع كيا ( السليم )' : (cp.sn === 'EK0201000045' ? 'فرع هونداي ( الرواف )' : 'الفرع الرئيسي'));
      const deptName = emp.department_name || (branchName.includes('إدارة') ? 'مكتب الإدارة' : 'درة السيارة لقطع الغيار');
      let deviceSource = '.1 EK0201000043';
      if (cp.sn === 'EK0201000045') deviceSource = '.3 EK0201000045';
      else if (cp.sn === 'EK0201000044') deviceSource = '.2 EK0201000044';
      else if (cp.sn === 'EK0201000043') deviceSource = '.1 EK0201000043';
      else if (branchName.includes('هونداي') || branchName.includes('الرواف')) deviceSource = '.3 EK0201000045';
      else if (branchName.includes('كيا') || branchName.includes('السليم')) deviceSource = '.2 EK0201000044';
      else deviceSource = '.1 EK0201000043';

      const punchType = classifyShiftPunch(timeClean, emp);
      const empShiftName = emp.shift || 'دوام رسمي';

      list.push({
        id: punchIdKey,
        logId: null,
        cloudPunchId: cp.id,
        employee_name: emp.full_name || ('موظف رقم ' + pin),
        employee_number: emp.employee_number || pin,
        emp_shift: empShiftName,
        branch_name: branchName,
        department_name: deptName,
        device_source: deviceSource,
        timestamp_raw: `${datePart}T${cp.time?.includes(' ') ? cp.time.split(' ')[1] : timeClean}`,
        timestamp_display: `${timeClean} ${datePart}`,
        inserted_at: `${timeClean} ${datePart}`,
        punch_type: punchType
      });
    });

    // 2. Process Attendance Logs (Baseline and Manual punches)
    attendanceLogs.forEach(log => {
      const logD = normalizeIsoDate(log.log_date);
      // Date filter
      if (logD < cleanStart || logD > cleanEnd) return;

      const emp = empMap[String(log.employee_number)] || empMap[log.employee_name] || {};
      const branchName = emp.branch_name || emp.branch || 'الفرع الرئيسي';
      const deptName = emp.department_name || (branchName.includes('إدارة') ? 'مكتب الإدارة' : 'درة السيارة لقطع الغيار');
      
      let logSn = '';
      let parsedRawPunches = [];
      if (log.notes) {
        try {
          const nObj = typeof log.notes === 'string' ? JSON.parse(log.notes) : log.notes;
          logSn = nObj.device_source || '';
          if (nObj.raw_punches) {
            parsedRawPunches = String(nObj.raw_punches).split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (e) {}
      }

      // Determine device serial based on device_source or branch
      let deviceSource = '.1 EK0201000043';
      if (logSn.includes('EK0201000045') || branchName.includes('هونداي') || branchName.includes('الرواف')) {
        deviceSource = '.3 EK0201000045';
      } else if (logSn.includes('EK0201000044') || branchName.includes('كيا') || branchName.includes('السليم')) {
        deviceSource = '.2 EK0201000044';
      } else {
        deviceSource = '.1 EK0201000043';
      }

      if (!parsedRawPunches.length && log.raw_punches) {
        parsedRawPunches = String(log.raw_punches).split(',').map(s => s.trim()).filter(Boolean);
      }

      if (parsedRawPunches.length > 0) {
        parsedRawPunches.forEach((pt, pIdx) => {
          const timeClean = pt.length === 5 ? `${pt}:00` : pt;
          const hm = timeClean.slice(0, 5);

          const punchKey = `${log.employee_number}_${hm}`;
          const punchIdKey = `${log.id}_p_${pIdx}`;
          if (localBlacklist.includes(punchKey) || localBlacklist.includes(punchIdKey)) {
            return;
          }
          if (seenPunchKeys.has(`${log.employee_number}_${logD}_${hm}`)) {
            return;
          }
          seenPunchKeys.add(`${log.employee_number}_${logD}_${hm}`);

          let punchType = 'حركة إضافية / مكررة';

          if (log.period_2_in && hm === log.period_2_in) {
            punchType = 'دخول (مسائي)';
          } else if (log.period_2_out && hm === log.period_2_out) {
            punchType = 'خروج (مسائي)';
          } else if (log.period_1_in && hm === log.period_1_in) {
            punchType = 'دخول (صباحي)';
          } else if (log.period_1_out && hm === log.period_1_out) {
            punchType = 'خروج (صباحي)';
          } else if (hm >= '14:00') {
            punchType = (pIdx === parsedRawPunches.length - 1 && parsedRawPunches.length > 1) ? 'خروج (مسائي)' : 'دخول (مسائي)';
          } else {
            punchType = (pIdx === parsedRawPunches.length - 1 && parsedRawPunches.length > 1) ? 'خروج (صباحي)' : 'دخول (صباحي)';
          }

          list.push({
            id: punchIdKey,
            logId: log.id,
            employee_name: log.employee_name || emp.full_name || 'موظف',
            employee_number: log.employee_number || emp.employee_number || '1001',
            branch_name: branchName,
            department_name: deptName,
            device_source: deviceSource,
            timestamp_raw: `${logD}T${timeClean}`,
            timestamp_display: `${timeClean.slice(0, 5)} ${logD}`,
            inserted_at: `${timeClean.slice(0, 5)} ${logD}`,
            punch_type: punchType
          });
        });
      } else {
        // Check-in punch
        if (log.check_in) {
          const cInTime = log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5);
          const isEve = cInTime >= '14:00';
          const punchKey = `${log.employee_number}_${cInTime}`;
          const punchIdKey = `${log.id}_in`;

          if (!localBlacklist.includes(punchKey) && !localBlacklist.includes(punchIdKey) && !seenPunchKeys.has(`${log.employee_number}_${logD}_${cInTime}`)) {
            seenPunchKeys.add(`${log.employee_number}_${logD}_${cInTime}`);
            list.push({
              id: punchIdKey,
              logId: log.id,
              employee_name: log.employee_name || emp.full_name || 'موظف',
              employee_number: log.employee_number || emp.employee_number || '1001',
              branch_name: branchName,
              department_name: deptName,
              device_source: deviceSource,
              timestamp_raw: log.check_in,
              timestamp_display: `${cInTime} ${logD}`,
              inserted_at: `${cInTime} ${logD}`,
              punch_type: isEve ? 'دخول (مسائي)' : 'دخول (صباحي)'
            });
          }
        }

        // Check-out punch
        if (log.check_out) {
          const cOutTime = log.check_out.includes('T') ? log.check_out.slice(11, 16) : log.check_out.slice(0, 5);
          const isEve = cOutTime >= '14:00';
          const punchKey = `${log.employee_number}_${cOutTime}`;
          const punchIdKey = `${log.id}_out`;

          if (!localBlacklist.includes(punchKey) && !localBlacklist.includes(punchIdKey) && !seenPunchKeys.has(`${log.employee_number}_${logD}_${cOutTime}`)) {
            seenPunchKeys.add(`${log.employee_number}_${logD}_${cOutTime}`);
            list.push({
              id: punchIdKey,
              logId: log.id,
              employee_name: log.employee_name || emp.full_name || 'موظف',
              employee_number: log.employee_number || emp.employee_number || '1001',
              branch_name: branchName,
              department_name: deptName,
              device_source: deviceSource,
              timestamp_raw: log.check_out,
              timestamp_display: `${cOutTime} ${logD}`,
              inserted_at: `${cOutTime} ${logD}`,
              punch_type: isEve ? 'خروج (مسائي)' : 'خروج (صباحي)'
            });
          }
        }
      }
    });

    // Sort descending by timestamp
    const sorted = list.sort((a, b) => b.timestamp_raw.localeCompare(a.timestamp_raw));
    if (isManagerOrAdmin) return sorted;

    // Strict Employee Isolation: ordinary employees can ONLY see their own punches!
    const clean = (v) => String(v || '').replace('emp_', '').trim();
    const myEmpNum = clean(user?.employee_number || user?.id);
    const myName = (user?.full_name || user?.name || '').trim();

    return sorted.filter(p => {
      const pNum = clean(p.employee_number);
      return (myEmpNum && pNum === myEmpNum) || (myName && p.employee_name === myName);
    });
  }, [attendanceLogs, rawCloudPunches, startDate, endDate, empMap, isManagerOrAdmin, user]);

  // Filtered by Search & Branch
  const filteredPunches = useMemo(() => {
    if (!isManagerOrAdmin) {
      return flattenedPunches;
    }
    return flattenedPunches.filter(p => {
      const matchSearch = !searchEmployee ||
        p.employee_name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        p.employee_number.toString().includes(searchEmployee);
      const matchBranch = selectedBranch === 'all' || p.branch_name === selectedBranch;
      return matchSearch && matchBranch;
    });
  }, [flattenedPunches, searchEmployee, selectedBranch, isManagerOrAdmin]);

  // Branches list
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // ─── CHECK IF LOGGED-IN EMPLOYEE HAS A 4-PUNCH SHIFT (SPLIT / DUAL SHIFTS) ───
  const isEmployeeSplitShift = useMemo(() => {
    const clean = (v) => String(v || '').replace('emp_', '').trim();
    const matchedEmp = employees.find(e => 
      (user?.id && clean(e.id) === clean(user.id)) ||
      (user?.employee_number && clean(e.employee_number) === clean(user.employee_number)) ||
      (user?.national_id && e.national_id && String(e.national_id).trim() === String(user.national_id).trim()) ||
      (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
    ) || user;

    if (!matchedEmp) return false;

    const sName = String(matchedEmp.shift_name || matchedEmp.shift || '');
    if (
      sName.includes('غير سعودي') || 
      sName.includes('فترتين') || 
      sName.includes('9 ساعات') || 
      sName.includes('8 ساعات') || 
      sName.includes('صباحي ومسائي') ||
      sName.includes('دوامين') ||
      sName.includes('دوام كامل') ||
      sName.toLowerCase().includes('split')
    ) {
      return true;
    }

    const empShift = shifts.find(s => 
      String(s.id) === String(matchedEmp.shift_id) || 
      s.name === matchedEmp.shift || 
      s.name === matchedEmp.shift_name
    );
    if (empShift && (empShift.type === 'split' || empShift.type === 'two_shifts' || empShift.is_split || (empShift.period_2_in && empShift.period_2_out))) {
      return true;
    }

    const myEmpNum = clean(matchedEmp.employee_number || matchedEmp.id || user?.employee_number || user?.id);
    const hasP2Logs = (attendanceLogs || []).some(l => {
      const lNum = clean(l.employee_number || l.employee_id || l.user_id);
      return lNum === myEmpNum && (l.period_2_in || l.period_2_out);
    });
    if (hasP2Logs) return true;

    return false;
  }, [user, employees, shifts, attendanceLogs]);

  // ─── PERSONAL DAILY LOGS FOR EMPLOYEE VIEW (سجل الدوام الشخصي) ───────────
  const personalDailyLogs = useMemo(() => {
    const clean = (v) => String(v || '').replace('emp_', '').trim();

    // Match employee record for logged-in user accurately
    const matchedEmp = employees.find(e => 
      (user?.id && clean(e.id) === clean(user.id)) ||
      (user?.employee_number && clean(e.employee_number) === clean(user.employee_number)) ||
      (user?.national_id && e.national_id && String(e.national_id).trim() === String(user.national_id).trim()) ||
      (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
    ) || user;

    const myEmpNum = clean(matchedEmp?.employee_number || user?.employee_number || user?.id);
    const myFullName = (matchedEmp?.name || matchedEmp?.full_name || user?.full_name || user?.name || '').trim();
    const myFirstName = myFullName.split(/\s+/)[0] || 'الموظف';

    const cleanStart = normalizeIsoDate(startDate, '2020-01-01');
    const cleanEnd = normalizeIsoDate(endDate, '2030-12-31');

    // Map by date (YYYY-MM-DD)
    const dailyMap = new Map();

    // 1. Process Attendance Logs
    (attendanceLogs || []).forEach(log => {
      const logEmpNum = clean(log.employee_number || log.employee_id || log.user_id);
      const logEmpName = (log.employee_name || '').trim();
      const isMatch = (myEmpNum && logEmpNum === myEmpNum) || (myFullName && logEmpName === myFullName);
      if (!isMatch) return;

      const dateStr = normalizeIsoDate(log.log_date);
      if (dateStr < cleanStart || dateStr > cleanEnd) return;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          date: dateStr,
          firstName: (log.employee_name || myFullName).trim().split(/\s+/)[0] || myFirstName,
          punches: []
        });
      }
      const entry = dailyMap.get(dateStr);

      if (log.period_1_in) {
        const timeClean = log.period_1_in.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }
      if (log.period_1_out) {
        const timeClean = log.period_1_out.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }
      if (log.period_2_in) {
        const timeClean = log.period_2_in.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }
      if (log.period_2_out) {
        const timeClean = log.period_2_out.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }

      if (log.check_in) {
        const timeClean = log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }
      if (log.check_out) {
        const timeClean = log.check_out.includes('T') ? log.check_out.slice(11, 16) : log.check_out.slice(0, 5);
        if (timeClean && !entry.punches.includes(timeClean)) entry.punches.push(timeClean);
      }

      if (log.timestamp_raw) {
        const extracted = String(log.timestamp_raw).match(/\b\d{2}:\d{2}\b/g) || [];
        extracted.forEach(pt => {
          if (!entry.punches.includes(pt)) entry.punches.push(pt);
        });
      }

      if (log.notes) {
        try {
          const nObj = typeof log.notes === 'string' ? JSON.parse(log.notes) : log.notes;
          if (nObj.raw_punches) {
            String(nObj.raw_punches).split(',').map(s => s.trim().slice(0, 5)).filter(Boolean).forEach(pt => {
              if (!entry.punches.includes(pt)) entry.punches.push(pt);
            });
          }
        } catch(e) {}
      }
    });

    // 2. Process Raw Cloud Hardware Punches
    (rawCloudPunches || []).forEach(p => {
      const pEmpNum = clean(p.enrollid || p.user_id || p.employee_number);
      if (!myEmpNum || pEmpNum !== myEmpNum) return;

      const rawTime = p.time || p.timestamp || '';
      let dPart = '', tPart = '';
      if (rawTime.includes('T')) {
        const parts = rawTime.split('T');
        dPart = parts[0];
        tPart = parts[1]?.slice(0, 5) || '';
      } else if (rawTime.includes(' ')) {
        const parts = rawTime.split(' ');
        dPart = parts[0];
        tPart = parts[1]?.slice(0, 5) || '';
      }

      if (!dPart || !tPart) return;
      const dateStr = normalizeIsoDate(dPart);
      if (!dateStr || dateStr < cleanStart || dateStr > cleanEnd) return;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          date: dateStr,
          firstName: myFirstName,
          punches: []
        });
      }
      const entry = dailyMap.get(dateStr);
      if (!entry.punches.includes(tPart)) entry.punches.push(tPart);
    });

    // Format final daily rows sorted descending by date
    const rows = Array.from(dailyMap.values()).map(entry => {
      const allTimes = Array.from(new Set(entry.punches)).sort();
      const parsed = parseRawPunchesToPeriods(allTimes.join(', '), true);

      let p1In = parsed.period_1_in || '--:--';
      let p1Out = parsed.period_1_out || '--:--';
      let p2In = parsed.period_2_in || '--:--';
      let p2Out = parsed.period_2_out || '--:--';

      // Fallback distribution for 4 punches if time-of-day slots missed
      if (allTimes.length >= 4 && p2In === '--:--' && p2Out === '--:--') {
        p1In = allTimes[0];
        p1Out = allTimes[1];
        p2In = allTimes[2];
        p2Out = allTimes[3];
      } else if (allTimes.length === 3 && p2In === '--:--') {
        p1In = allTimes[0];
        p1Out = allTimes[1];
        p2In = allTimes[2];
      } else if (allTimes.length === 2 && p1Out === '--:--' && p2In === '--:--') {
        p1In = allTimes[0];
        p1Out = allTimes[1];
      }

      const checkIn = allTimes.length > 0 ? allTimes[0] : '--:--';
      const checkOut = allTimes.length > 1 ? allTimes[allTimes.length - 1] : '--:--';

      return {
        date: entry.date,
        firstName: entry.firstName,
        p1In,
        p1Out,
        p2In,
        p2Out,
        checkIn,
        checkOut,
        punchesCount: allTimes.length
      };
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceLogs, rawCloudPunches, startDate, endDate, user, employees]);

  // Export CSV
  const exportCSV = () => {
    if (isShowingPersonalOnly) {
      if (personalDailyLogs.length === 0) {
        toast({ title: 'لا توجد بيانات للتصدير' });
        return;
      }

      if (isEmployeeSplitShift) {
        const headers = ['الاسم الأول', 'التاريخ', 'دخول فترة 1', 'خروج فترة 1', 'دخول فترة 2', 'خروج فترة 2'];
        const rows = personalDailyLogs.map(r =>
          sanitizeCsvRow([r.firstName, r.date, r.p1In, r.p1Out, r.p2In, r.p2Out])
        );
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `بصماتي_الشخصية_4_بصمات_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: '✓ تم تصدير سجل بصماتك الشخصية (4 بصمات) بنجاح' });
        return;
      }

      const headers = ['الاسم الأول', 'التاريخ', 'بصمة الدخول', 'بصمة الخروج'];
      const rows = personalDailyLogs.map(r =>
        sanitizeCsvRow([r.firstName, r.date, r.checkIn, r.checkOut])
      );
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `بصماتي_الشخصية_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: '✓ تم تصدير سجل بصماتك الشخصية بنجاح' });
      return;
    }

    if (filteredPunches.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    const headers = ['الموظف', 'الرقم الوظيفي', 'الفرع', 'الإدارة', 'المصدر', 'الطابع الزمني', 'التاريخ المدرج'];
    const rows = filteredPunches.map(p =>
      sanitizeCsvRow([
        p.employee_name,
        p.employee_number,
        p.branch_name,
        p.department_name,
        p.device_source,
        p.timestamp_display,
        p.inserted_at
      ])
    );

    // [Security] Formula-injection-safe: cleanCell prefixes formula triggers with a single-quote.
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `بصمات_الدوام_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: '✓ تم تصدير ملف البصمات بنجاح' });
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    try {
      toast({
        title: 'جاري سحب وتدقيق البصمات ⚡',
        description: 'جاري الاتصال بخادم adms.doracar.com وتحديث حركات البصمة فورياً...'
      });

      const res = await syncAttendanceNow({ pullHardware: true }, employees);
      if (!res?.success) throw new Error(res?.error || 'لم يكتمل حفظ البصمات في قاعدة البيانات.');
      await loadData();

      if (res && res.importedCount > 0) {
        toast({
          title: '✓ تم سحب وتحديث البصمات بنجاح',
          description: `تم حفظ ${res.importedCount} سجل حضور يومي في قاعدة البيانات وتحديث الجدول.`,
          className: 'bg-emerald-950/90 text-emerald-100 border-emerald-700'
        });
      } else {
        toast({
          title: 'لا توجد سجلات جديدة للحفظ',
          description: `أعاد خادم البصمات ${res?.totalOnServer || 0} حركة. قد يتطلب رد الأجهزة على أمر السحب بعض الوقت.`,
          className: 'bg-sky-950/90 text-sky-100 border-sky-700'
        });
      }
    } catch (e) {
      toast({
        title: 'خطأ أثناء سحب البصمات',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingNow(false);
    }
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

    const emp = employees.find(e => String(e.id) === String(manualForm.employee_id) || String(e.employee_number) === String(manualForm.employee_id));
    const empId = emp ? emp.id : manualForm.employee_id;
    const empNum = emp ? String(emp.employee_number) : '';
    const empName = emp ? emp.full_name : 'موظف';
    const sched = getShiftSchedule(emp);
    const isSplitShift = sched.isSplit;

    // Validation: At least one checkbox must be selected
    const hasAnySelected = isSplitShift
      ? (selectedPunches.p1_in || selectedPunches.p1_out || selectedPunches.p2_in || selectedPunches.p2_out)
      : (selectedPunches.single_in || selectedPunches.single_out);

    if (!hasAnySelected) {
      toast({
        title: 'تنبيه: لم يتم تحديد أي بصمة',
        description: 'يرجى التعليم على مربع الاختيار (Checkbox) للبصمة التي تريد إضافتها أولاً.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const parseM = (t) => {
        if (!t) return null;
        const clean = t.replace(/[^0-9:]/g, '');
        const p = clean.split(':');
        return p.length >= 2 ? (parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) : null;
      };

      // Check if an existing log exists for this employee on this date
      const existingLog = attendanceLogs.find(l => 
        (String(l.employee_id) === String(empId) || String(l.employee_number) === String(empNum)) && 
        normalizeIsoDate(l.log_date) === normalizeIsoDate(manualForm.log_date)
      );

      let existingNotes = {};
      let existingRawPunches = [];
      if (existingLog) {
        try {
          existingNotes = typeof existingLog.notes === 'string' ? JSON.parse(existingLog.notes) : (existingLog.notes || {});
          if (existingNotes.raw_punches) {
            existingRawPunches = String(existingNotes.raw_punches).split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (e) {}
        if (!existingRawPunches.length && existingLog.timestamp_raw) {
          existingRawPunches = String(existingLog.timestamp_raw).split(/[&,]/).map(s => s.trim().replace(/--/g, '').trim()).filter(Boolean);
        }
      }

      // Collect updated periods
      let p1In = existingLog?.period_1_in || '';
      let p1Out = existingLog?.period_1_out || '';
      let p2In = existingLog?.period_2_in || '';
      let p2Out = existingLog?.period_2_out || '';
      let sIn = existingLog?.check_in ? (existingLog.check_in.includes('T') ? existingLog.check_in.slice(11, 16) : existingLog.check_in.slice(0, 5)) : '';
      let sOut = existingLog?.check_out ? (existingLog.check_out.includes('T') ? existingLog.check_out.slice(11, 16) : existingLog.check_out.slice(0, 5)) : '';

      const newlyAddedPunches = [];
      const punchLabelsAdded = [];

      if (isSplitShift) {
        if (selectedPunches.p1_in && manualForm.period_1_in) {
          p1In = manualForm.period_1_in;
          newlyAddedPunches.push(`${manualForm.period_1_in}:00`);
          punchLabelsAdded.push('دخول صباحي');
        }
        if (selectedPunches.p1_out && manualForm.period_1_out) {
          p1Out = manualForm.period_1_out;
          newlyAddedPunches.push(`${manualForm.period_1_out}:00`);
          punchLabelsAdded.push('خروج صباحي');
        }
        if (selectedPunches.p2_in && manualForm.period_2_in) {
          p2In = manualForm.period_2_in;
          newlyAddedPunches.push(`${manualForm.period_2_in}:00`);
          punchLabelsAdded.push('دخول مسائي');
        }
        if (selectedPunches.p2_out && manualForm.period_2_out) {
          p2Out = manualForm.period_2_out;
          newlyAddedPunches.push(`${manualForm.period_2_out}:00`);
          punchLabelsAdded.push('خروج مسائي');
        }
      } else {
        if (selectedPunches.single_in && manualForm.check_in) {
          sIn = manualForm.check_in;
          p1In = manualForm.check_in;
          newlyAddedPunches.push(`${manualForm.check_in}:00`);
          punchLabelsAdded.push('دخول');
        }
        if (selectedPunches.single_out && manualForm.check_out) {
          sOut = manualForm.check_out;
          p1Out = manualForm.check_out;
          newlyAddedPunches.push(`${manualForm.check_out}:00`);
          punchLabelsAdded.push('خروج');
        }
      }

      // Merge newly added punches with existing punches (no duplicates, sorted)
      const allPunchesSet = new Set(existingRawPunches.map(p => p.length === 5 ? `${p}:00` : p));
      newlyAddedPunches.forEach(p => allPunchesSet.add(p));
      const mergedPunchesList = Array.from(allPunchesSet).sort();

      // Calculate total hours
      let totalHrs = existingLog?.total_hours || 0;
      if (isSplitShift) {
        const m1In = parseM(p1In);
        const m1Out = parseM(p1Out);
        const m2In = parseM(p2In);
        const m2Out = parseM(p2Out);

        let dur1 = 0;
        if (m1In !== null && m1Out !== null) {
          dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
        }
        let dur2 = 0;
        if (m2In !== null && m2Out !== null) {
          dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
        }
        totalHrs = Math.round(((dur1 + dur2) / 60) * 10) / 10;
      } else {
        const inM = parseM(sIn);
        const outM = parseM(sOut);
        if (inM !== null && outM !== null) {
          const diff = outM >= inM ? outM - inM : (outM + 1440) - inM;
          totalHrs = Math.round((diff / 60) * 10) / 10;
        }
      }

      const shiftHours = isSplitShift ? 9 : 8;
      let finalStatus = manualForm.status || existingLog?.status || 'present';
      if (manualForm.status !== 'absent' && manualForm.status !== 'unpaid_leave') {
        if (totalHrs > 0 && totalHrs < shiftHours) {
          finalStatus = 'late';
        } else if (totalHrs >= shiftHours) {
          finalStatus = 'present';
        } else if (totalHrs === 0 && mergedPunchesList.length === 0) {
          finalStatus = 'absent';
        }
      }

      const checkInFinal = isSplitShift 
        ? (p1In ? `${manualForm.log_date}T${p1In}:00` : (p2In ? `${manualForm.log_date}T${p2In}:00` : existingLog?.check_in || null))
        : (sIn ? `${manualForm.log_date}T${sIn}:00` : existingLog?.check_in || null);

      const checkOutFinal = isSplitShift
        ? (p2Out ? `${manualForm.log_date}T${p2Out}:00` : (p1Out ? `${manualForm.log_date}T${p1Out}:00` : existingLog?.check_out || null))
        : (sOut ? `${manualForm.log_date}T${sOut}:00` : existingLog?.check_out || null);

      const notesPayload = {
        ...existingNotes,
        employee_number: empNum,
        user_id: empId,
        total_hours: totalHrs,
        raw_punches: mergedPunchesList.join(', '),
        shift_name: sched.shiftName,
        period_1_in: p1In,
        period_1_out: p1Out,
        period_2_in: p2In,
        period_2_out: p2Out,
        manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
        manual_edit_at: new Date().toISOString()
      };

      const logPayload = {
        id: existingLog ? existingLog.id : ('att_man_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
        employee_id: empId,
        user_id: empId,
        employee_name: empName,
        employee_number: empNum,
        log_date: manualForm.log_date,
        check_in: checkInFinal,
        check_out: checkOutFinal,
        status: finalStatus,
        timestamp_raw: mergedPunchesList.join(', '),
        total_hours: totalHrs,
        period_1_in: p1In,
        period_1_out: p1Out,
        period_2_in: p2In,
        period_2_out: p2Out,
        notes: JSON.stringify(notesPayload)
      };

      if (existingLog) {
        await base44.entities.AttendanceLog.update(existingLog.id, logPayload);
        setAttendanceLogs(prev => prev.map(l => l.id === existingLog.id ? logPayload : l));
      } else {
        await base44.entities.AttendanceLog.create(logPayload);
        setAttendanceLogs(prev => [logPayload, ...prev]);
      }

      toast({ 
        title: '✓ تم توثيق البصمة بنجاح', 
        description: `تم تسجيل بصمة (${punchLabelsAdded.join(' و ')}) للموظف ${empName} وتحديث سجل اليوم فورياً.` 
      });

      setManualPunchOpen(false);
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء تسجيل البصمة', description: e.message, variant: 'destructive' });
    }
  };

  const addToBlacklist = (enrollid, timePart, id) => {
    try {
      const list = JSON.parse(localStorage.getItem('dorat_deleted_punches') || '[]');
      if (enrollid && timePart) list.push(`${enrollid}_${timePart}`);
      if (id) list.push(id);
      localStorage.setItem('dorat_deleted_punches', JSON.stringify(Array.from(new Set(list))));
    } catch(e) {}
  };

  const handleDeletePunch = async (punch) => {
    if (!isManagerOrAdmin) {
      toast({ title: 'غير مصرح', description: 'هذا الإجراء مخصص لمدير الموارد البشرية فقط.', variant: 'destructive' });
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف بصمة ${punch.employee_name} (${punch.timestamp_display})؟`)) return;
    try {
      const timePart = punch.timestamp_display?.split(' ')[0] || '';
      const enrollid = String(punch.employee_number || '').trim();

      // Immediately add to local blacklist
      addToBlacklist(enrollid, timePart, punch.id);

      // 1. Delete/Update from Base44 AttendanceLog entity
      if (punch.logId) {
        try {
          const currentLog = attendanceLogs.find(l => l.id === punch.logId);
          if (currentLog) {
            let rawList = [];
            try {
              const n = typeof currentLog.notes === 'string' ? JSON.parse(currentLog.notes) : (currentLog.notes || {});
              if (n.raw_punches) rawList = String(n.raw_punches).split(',').map(s => s.trim()).filter(Boolean);
            } catch(e) {}

            const filteredRaw = rawList.filter(t => !t.startsWith(timePart));
            if (filteredRaw.length === 0) {
              await base44.entities.AttendanceLog.delete(punch.logId);
              setAttendanceLogs(prev => prev.filter(log => log.id !== punch.logId));
            } else {
              const updatedNotes = typeof currentLog.notes === 'string' ? JSON.parse(currentLog.notes) : (currentLog.notes || {});
              updatedNotes.raw_punches = filteredRaw.join(', ');
              const updatedLog = {
                ...currentLog,
                notes: JSON.stringify(updatedNotes),
                timestamp_raw: filteredRaw.join(', ')
              };
              await base44.entities.AttendanceLog.update(punch.logId, updatedLog);
              setAttendanceLogs(prev => prev.map(l => l.id === punch.logId ? updatedLog : l));
            }
          } else {
            await base44.entities.AttendanceLog.delete(punch.logId);
            setAttendanceLogs(prev => prev.filter(log => log.id !== punch.logId));
          }
        } catch (eBase44) {
          console.warn('Base44 delete warning:', eBase44);
        }
      }

      // 2. Delete permanently from Cloud ADMS punches.json on doracar.com
      try {
        await authenticatedFetch(`https://doracar.com/api/adms_sync.php?action=delete_punch&enrollid=${encodeURIComponent(enrollid)}&time=${encodeURIComponent(timePart)}&punch_id=${encodeURIComponent(punch.id || '')}`, {
          method: 'POST',
          cache: 'no-store'
        });
      } catch (eCloud) {
        console.warn('Cloud punch delete warning:', eCloud);
      }

      toast({ 
        title: '✓ تم حذف البصمة نهائياً',
        description: `تم إزالة بصمة ${punch.employee_name} من قاعدة البيانات والسيرفر السحابي.` 
      });

      // Reload fresh data
      await loadData();
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
            {isManagerOrAdmin ? 'إدارة البصمات' : 'سجل حركات البصمة والدوام'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isManagerOrAdmin 
              ? 'مركز تدقيق ومراقبة حركات الدخول والخروج من أجهزة البصمة المربوطة سحابياً'
              : 'استعراض سجل حركات الدخول والخروج الخاصة بك المسجلة عبر أجهزة البصمة'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {isManagerOrAdmin ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  بث حي مباشر لحظة بلحظة (ADMS Cloud Live)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/25 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  خادم الاستقبال الفوري: متصل (adms.doracar.com)
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                سجل البصمات معتمد ومحدث تلقائياً ✓
              </span>
            )}
          </div>
        </div>

        {/* Manager/Admin Switcher: Company vs Personal View */}
        {isManagerOrAdmin && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setReportViewMode('company')}
              className={`rounded-xl text-xs font-bold h-8 px-3 transition-all ${
                reportViewMode === 'company'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              سجل كافة الموظفين
            </button>
            <button
              type="button"
              onClick={() => setReportViewMode('personal')}
              className={`rounded-xl text-xs font-bold h-8 px-3 transition-all ${
                reportViewMode === 'personal'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              بصماتي الشخصية (عرض الموظف)
            </button>
          </div>
        )}

        {/* Time Filters Bar (الكل • اليوم • الأمس • الفترة الزمنية) */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-border/80 p-1.5 rounded-2xl shadow-sm">
          <Button
            size="sm"
            variant={filterMode === 'all' ? 'default' : 'ghost'}
            onClick={() => {
              setFilterMode('all');
              setStartDate('2026-10-01');
              setEndDate(todayStr());
            }}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            جميع الحركات
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'today' ? 'default' : 'ghost'}
            onClick={() => {
              setFilterMode('today');
              setStartDate(todayStr());
              setEndDate(todayStr());
            }}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'today' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            اليوم
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'yesterday' ? 'default' : 'ghost'}
            onClick={() => {
              setFilterMode('yesterday');
              setStartDate(yesterdayStr());
              setEndDate(yesterdayStr());
            }}
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
        
        {/* Left Actions: Manual Punch & Export Data & Bulk Delete */}
        <div className="flex items-center gap-2">
          {isManagerOrAdmin && selectedRows.length > 0 && (
            <Button
              onClick={async () => {
                if (!confirm(`هل أنت متأكد من حذف ${selectedRows.length} بصمة محددة نهائياً؟`)) return;
                try {
                  for (const id of selectedRows) {
                    const punch = filteredPunches.find(p => p.id === id);
                    if (punch) {
                      const timePart = punch.timestamp_display?.split(' ')[0] || '';
                      const enrollid = String(punch.employee_number || '').trim();
                      addToBlacklist(enrollid, timePart, punch.id);

                      if (punch.logId) {
                        try { await base44.entities.AttendanceLog.delete(punch.logId); } catch(e){}
                      }
                      try {
                        await authenticatedFetch(`https://doracar.com/api/adms_sync.php?action=delete_punch&enrollid=${encodeURIComponent(enrollid)}&time=${encodeURIComponent(timePart)}&punch_id=${encodeURIComponent(punch.id || '')}`, {
                          method: 'POST',
                          cache: 'no-store'
                        });
                      } catch(e){}
                    }
                  }
                  setSelectedRows([]);
                  toast({ title: `✓ تم حذف ${selectedRows.length} بصمة بنجاح نهائياً` });
                  await loadData();
                } catch(err) {
                  toast({ title: 'خطأ أثناء الحذف الجماعي', description: err.message, variant: 'destructive' });
                }
              }}
              variant="destructive"
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-rose-600 hover:bg-rose-500 shadow-sm animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedRows.length})</span>
            </Button>
          )}

          {isManagerOrAdmin && (
            <>
              <Button
                onClick={handleSyncNow}
                disabled={syncingNow}
                className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold gap-2 h-9 shadow-sm transition-all"
                title="سحب البصمات فورياً وتحديث جدول الحضور"
              >
                <RotateCw className={`w-4 h-4 ${syncingNow ? 'animate-spin' : ''}`} />
                <span>{syncingNow ? 'جاري السحب...' : 'سحب البصمات الآن ⚡'}</span>
              </Button>

              <Button
                onClick={() => setManualPunchOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل بصمة يدوية للموظف</span>
              </Button>
            </>
          )}

          <Button
            onClick={exportCSV}
            variant="outline"
            className="rounded-xl text-xs font-bold gap-2 h-9 border-border/80 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>{isManagerOrAdmin ? 'تصدير البيانات' : 'تصدير سجلاتي'}</span>
          </Button>
        </div>

        {/* Right Search Input & Filters (Manager Only) */}
        {isManagerOrAdmin && (
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
        )}

      </div>

      {/* ─── 3. BIOMETRICS LOG TABLE ───────────────────────────────────────── */}
      {isShowingPersonalOnly ? (
        /* ─── PERSONAL EMPLOYEE VIEW (عرض الموظف: 4 بصمات للشفت فترتين أو بصمتين للشفت المفرد) ─── */
        <Card className="rounded-3xl border shadow-md overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-3 sm:p-4 bg-sky-50/70 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-sky-900 dark:text-sky-200">
            <span className="flex items-center gap-1.5 flex-wrap">
              <Fingerprint className="w-4 h-4 text-sky-600" />
              <span>تقرير البصمات الشخصية ({user?.full_name?.split(' ')[0] || 'الموظف'})</span>
              {isEmployeeSplitShift ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                  شفت فترتين (4 بصمات) ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  شفت فترة واحدة (بصمتين)
                </span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {personalDailyLogs.length} يوم مسجل
            </span>
          </div>

          <div className="w-full overflow-hidden">
            <table className="w-full text-center text-xs table-fixed" style={{ direction: 'rtl' }}>
              <thead>
                {isEmployeeSplitShift ? (
                  <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                    <th className="py-3 px-2 sm:px-3 text-right w-[24%]">الاسم الأول</th>
                    <th className="py-3 px-1 sm:px-2 text-center w-[19%]">دخول (ف1)</th>
                    <th className="py-3 px-1 sm:px-2 text-center w-[19%]">خروج (ف1)</th>
                    <th className="py-3 px-1 sm:px-2 text-center w-[19%]">دخول (ف2)</th>
                    <th className="py-3 px-1 sm:px-2 text-center w-[19%]">خروج (ف2)</th>
                  </tr>
                ) : (
                  <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                    <th className="py-3 px-3 text-right w-1/3">الاسم الأول</th>
                    <th className="py-3 px-2 text-center w-1/3">بصمة الدخول</th>
                    <th className="py-3 px-2 text-center w-1/3">بصمة الخروج</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={isEmployeeSplitShift ? 5 : 3} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                      جاري سحب وتدقيق بصمات الأجهزة...
                    </td>
                  </tr>
                ) : personalDailyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={isEmployeeSplitShift ? 5 : 3} className="py-12 text-center text-muted-foreground font-bold">
                      لا توجد بصمات شخصية مسجلة في التاريخ المحدد ({filterMode === 'today' ? 'اليوم' : startDate}).
                    </td>
                  </tr>
                ) : (
                  personalDailyLogs.map((row, idx) => (
                    <tr
                      key={row.date || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. الاسم الأول والتاريخ */}
                      <td className="py-3 px-2 sm:px-3 text-right">
                        <div className="font-bold text-xs sm:text-sm text-foreground truncate">{row.firstName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{row.date}</div>
                      </td>

                      {isEmployeeSplitShift ? (
                        <>
                          {/* 2. دخول ف1 */}
                          <td className="py-3 px-1 sm:px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-[11px] sm:text-xs px-2 py-1 rounded-xl shadow-2xs ${
                              row.p1In !== '--:--'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.p1In}
                            </span>
                          </td>

                          {/* 3. خروج ف1 */}
                          <td className="py-3 px-1 sm:px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-[11px] sm:text-xs px-2 py-1 rounded-xl shadow-2xs ${
                              row.p1Out !== '--:--'
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.p1Out}
                            </span>
                          </td>

                          {/* 4. دخول ف2 */}
                          <td className="py-3 px-1 sm:px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-[11px] sm:text-xs px-2 py-1 rounded-xl shadow-2xs ${
                              row.p2In !== '--:--'
                                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.p2In}
                            </span>
                          </td>

                          {/* 5. خروج ف2 */}
                          <td className="py-3 px-1 sm:px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-[11px] sm:text-xs px-2 py-1 rounded-xl shadow-2xs ${
                              row.p2Out !== '--:--'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.p2Out}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* 2. بصمة الدخول */}
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs ${
                              row.checkIn !== '--:--'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.checkIn}
                            </span>
                          </td>

                          {/* 3. بصمة الخروج */}
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs ${
                              row.checkOut !== '--:--'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                              {row.checkOut}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ─── FULL COMPANY ADMIN TABLE (EKTEFA SPEC) ─── */
        <Card className="rounded-3xl border shadow-md overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
              <thead>
                <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                  {isManagerOrAdmin && (
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
                  )}
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-3">الفرع</th>
                  <th className="py-3 px-3">الإدارة</th>
                  <th className="py-3 px-3">المصدر</th>
                  <th className="py-3 px-3">الطابع الزمني</th>
                  <th className="py-3 px-3">توزيع الحركة بالشفت</th>
                  <th className="py-3 px-3">التاريخ المدرج</th>
                  {isManagerOrAdmin && <th className="py-3 px-4 text-center">الخيارات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={isManagerOrAdmin ? 9 : 7} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                      جاري سحب وتدقيق بصمات الأجهزة...
                    </td>
                  </tr>
                ) : filteredPunches.length === 0 ? (
                  <tr>
                    <td colSpan={isManagerOrAdmin ? 9 : 7} className="py-12 text-center text-muted-foreground font-bold">
                      لا توجد بصمات مسجلة في التاريخ المحدد ({startDate}).
                    </td>
                  </tr>
                ) : (
                  filteredPunches.map((punch, idx) => (
                    <tr
                      key={punch.id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Checkbox (Manager Only) */}
                      {isManagerOrAdmin && (
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
                      )}

                      {/* Employee Name, Number & Shift Badge */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">{punch.employee_name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-muted-foreground">{punch.employee_number}</span>
                          {punch.emp_shift && (
                            <span className="text-[9.5px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200/60 dark:border-sky-800/60">
                              {punch.emp_shift}
                            </span>
                          )}
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

                      {/* Shift Punch Classification Badge */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10.5px] px-2.5 py-0.5 rounded-full ${
                          punch.punch_type?.includes('دخول (صباحي)')
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : punch.punch_type?.includes('خروج (صباحي)')
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20'
                            : punch.punch_type?.includes('دخول (مسائي)')
                            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20'
                            : punch.punch_type?.includes('خروج (مسائي)')
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            : punch.punch_type?.includes('مكررة')
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {punch.punch_type}
                        </span>
                      </td>

                      {/* Inserted At */}
                      <td className="py-3 px-3 font-mono text-muted-foreground text-xs">
                        {punch.inserted_at}
                      </td>

                      {/* Options / Actions (Red Trash Can - Manager Only) */}
                      {isManagerOrAdmin && (
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
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── MODAL: MANUAL PUNCH REGISTRATION (HR ADMIN) ────────────────── */}
      <Dialog open={manualPunchOpen} onOpenChange={setManualPunchOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
          {(() => {
            const selectedEmp = employees.find(e => String(e.id) === String(manualForm.employee_id) || String(e.employee_number) === String(manualForm.employee_id));
            const sched = getShiftSchedule(selectedEmp);
            const isSplitShift = sched.isSplit;
            const selectedCount = isSplitShift
              ? [selectedPunches.p1_in, selectedPunches.p1_out, selectedPunches.p2_in, selectedPunches.p2_out].filter(Boolean).length
              : [selectedPunches.single_in, selectedPunches.single_out].filter(Boolean).length;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-heading font-black text-base text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <span>تسجيل وتوثيق بصمات اليوم للموظف (صلاحية HR Admin)</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  
                  {/* 1. Select Employee */}
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
                        <span className="font-bold text-sky-700 dark:text-sky-300">{sched.shiftName}</span>
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

                  {/* 2. Biometric Punches Selection toolbar */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-border/70">
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-emerald-600" />
                      <span>اختر البصمة المراد تسجيلها وتحديد وقتها:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (isSplitShift) {
                            setSelectedPunches({ p1_in: true, p1_out: true, p2_in: true, p2_out: true, single_in: false, single_out: false });
                          } else {
                            setSelectedPunches({ p1_in: false, p1_out: false, p2_in: false, p2_out: false, single_in: true, single_out: true });
                          }
                        }}
                        className="h-6 text-[10px] px-2 text-primary font-bold hover:bg-primary/10 rounded-lg"
                      >
                        تحديد الكل
                      </Button>
                      <span className="text-muted-foreground text-[10px]">|</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPunches({ p1_in: false, p1_out: false, p2_in: false, p2_out: false, single_in: false, single_out: false })}
                        className="h-6 text-[10px] px-2 text-muted-foreground font-bold hover:bg-muted rounded-lg"
                      >
                        إلغاء التحديد
                      </Button>
                    </div>
                  </div>

                  {/* 3. Punches based on shift type */}
                  {isSplitShift ? (
                    /* ─── 4 PUNCHES (DUAL SHIFT) ──────────────────────────────────── */
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/80">
                      
                      {/* الفترة الصباحية */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-bold text-[11px] text-amber-700 dark:text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-amber-600" />
                            <span>بصمات الفترة الصباحية (الفترة 1)</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* 1. دخول صباحي */}
                          <div 
                            onClick={() => setSelectedPunches(prev => ({ ...prev, p1_in: !prev.p1_in }))}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              selectedPunches.p1_in 
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                                : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={selectedPunches.p1_in} 
                                  onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, p1_in: !!checked }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <span className="font-bold text-xs text-foreground">{sched.p1InLabel}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                {formatTime12h(sched.p1In)}
                              </Badge>
                            </div>

                            {selectedPunches.p1_in && (
                              <div 
                                className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span>وقت البصمة المراد تسجيلها:</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                    {formatTime12h(manualForm.period_1_in)}
                                  </span>
                                </div>
                                <Input 
                                  type="time" 
                                  value={manualForm.period_1_in} 
                                  onChange={(e) => setManualForm(prev => ({ ...prev, period_1_in: e.target.value }))}
                                  className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                                />
                              </div>
                            )}
                          </div>

                          {/* 2. خروج صباحي */}
                          <div 
                            onClick={() => setSelectedPunches(prev => ({ ...prev, p1_out: !prev.p1_out }))}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              selectedPunches.p1_out 
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                                : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={selectedPunches.p1_out} 
                                  onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, p1_out: !!checked }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <span className="font-bold text-xs text-foreground">{sched.p1OutLabel}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                {formatTime12h(sched.p1Out)}
                              </Badge>
                            </div>

                            {selectedPunches.p1_out && (
                              <div 
                                className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span>وقت البصمة المراد تسجيلها:</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                    {formatTime12h(manualForm.period_1_out)}
                                  </span>
                                </div>
                                <Input 
                                  type="time" 
                                  value={manualForm.period_1_out} 
                                  onChange={(e) => setManualForm(prev => ({ ...prev, period_1_out: e.target.value }))}
                                  className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Break indicator */}
                      <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>فترة الاستراحة الرسمية (البريك):</span>
                        </span>
                        <span className="font-mono font-bold" dir="ltr">{sched.breakTime}</span>
                      </div>

                      {/* الفترة المسائية */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                          <span className="flex items-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>بصمات الفترة المسائية (الفترة 2)</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* 3. دخول مسائي */}
                          <div 
                            onClick={() => setSelectedPunches(prev => ({ ...prev, p2_in: !prev.p2_in }))}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              selectedPunches.p2_in 
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                                : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={selectedPunches.p2_in} 
                                  onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, p2_in: !!checked }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <span className="font-bold text-xs text-foreground">{sched.p2InLabel}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                {formatTime12h(sched.p2In)}
                              </Badge>
                            </div>

                            {selectedPunches.p2_in && (
                              <div 
                                className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span>وقت البصمة المراد تسجيلها:</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                    {formatTime12h(manualForm.period_2_in)}
                                  </span>
                                </div>
                                <Input 
                                  type="time" 
                                  value={manualForm.period_2_in} 
                                  onChange={(e) => setManualForm(prev => ({ ...prev, period_2_in: e.target.value }))}
                                  className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                                />
                              </div>
                            )}
                          </div>

                          {/* 4. خروج مسائي */}
                          <div 
                            onClick={() => setSelectedPunches(prev => ({ ...prev, p2_out: !prev.p2_out }))}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              selectedPunches.p2_out 
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                                : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={selectedPunches.p2_out} 
                                  onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, p2_out: !!checked }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <span className="font-bold text-xs text-foreground">{sched.p2OutLabel}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                {formatTime12h(sched.p2Out)}
                              </Badge>
                            </div>

                            {selectedPunches.p2_out && (
                              <div 
                                className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span>وقت البصمة المراد تسجيلها:</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                    {formatTime12h(manualForm.period_2_out)}
                                  </span>
                                </div>
                                <Input 
                                  type="time" 
                                  value={manualForm.period_2_out} 
                                  onChange={(e) => setManualForm(prev => ({ ...prev, period_2_out: e.target.value }))}
                                  className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* ─── 2 PUNCHES (SINGLE SHIFT) ─────────────────────────────────── */
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/80">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        
                        {/* 1. دخول */}
                        <div 
                          onClick={() => setSelectedPunches(prev => ({ ...prev, single_in: !prev.single_in }))}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                            selectedPunches.single_in 
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                              : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={selectedPunches.single_in} 
                                onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, single_in: !!checked }))}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              <span className="font-bold text-xs text-foreground">{sched.singleInLabel}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                              {formatTime12h(sched.singleIn)}
                            </Badge>
                          </div>

                          {selectedPunches.single_in && (
                            <div 
                              className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  <span>وقت البصمة المراد تسجيلها:</span>
                                </span>
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                  {formatTime12h(manualForm.check_in)}
                                </span>
                              </div>
                              <Input 
                                type="time" 
                                value={manualForm.check_in} 
                                onChange={(e) => setManualForm(prev => ({ ...prev, check_in: e.target.value }))}
                                className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                              />
                            </div>
                          )}
                        </div>

                        {/* 2. خروج */}
                        <div 
                          onClick={() => setSelectedPunches(prev => ({ ...prev, single_out: !prev.single_out }))}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                            selectedPunches.single_out 
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                              : 'bg-white dark:bg-slate-900 border-border/70 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={selectedPunches.single_out} 
                                onCheckedChange={(checked) => setSelectedPunches(prev => ({ ...prev, single_out: !!checked }))}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              <span className="font-bold text-xs text-foreground">{sched.singleOutLabel}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10.5px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                              {formatTime12h(sched.singleOut)}
                            </Badge>
                          </div>

                          {selectedPunches.single_out && (
                            <div 
                              className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1 animate-in fade-in-50 duration-200" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  <span>وقت البصمة المراد تسجيلها:</span>
                                </span>
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-[10.5px]">
                                  {formatTime12h(manualForm.check_out)}
                                </span>
                              </div>
                              <Input 
                                type="time" 
                                value={manualForm.check_out} 
                                onChange={(e) => setManualForm(prev => ({ ...prev, check_out: e.target.value }))}
                                className="rounded-xl font-mono text-sm font-bold h-9 bg-white dark:bg-slate-900 border-emerald-400 focus:border-emerald-500 text-center"
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
                  <Button variant="outline" onClick={() => setManualPunchOpen(false)} className="rounded-xl font-bold text-xs">
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleCreateManualPunch} 
                    disabled={selectedCount === 0}
                    className={`${selectedCount > 0 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-400 cursor-not-allowed'} text-white rounded-xl font-bold text-xs shadow-md gap-1.5 transition-all`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {selectedCount > 0 
                        ? `حفظ وتوثيق (${selectedCount} ${selectedCount === 1 ? 'بصمة محددة' : 'بصمات'}) 💾` 
                        : 'حدد البصمة أولاً عبر المربع ✓'}
                    </span>
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
