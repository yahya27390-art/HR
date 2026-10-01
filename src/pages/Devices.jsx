import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import {
  Fingerprint,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Copy,
  Check,
  RefreshCw,
  Download,
  Sliders,
  Building2,
  Server,
  Activity,
  Key,
  Network,
  Eye,
  EyeOff,
  Terminal,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  getBiometricDevices,
  saveBiometricDevices,
  testDeviceConnection,
  requestDevicePull,
  syncCloudAttendanceLogs
} from '@/lib/biometricDevices';

export default function Devices() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const isAdmin = user?.role === 'system_admin' || user?.role === 'owner' || user?.role === 'general_manager' || user?.role === 'admin';

  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [testingAll, setTestingAll] = useState(false);
  const [pullingId, setPullingId] = useState(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showKeys, setShowKeys] = useState({});

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    serial_number: '',
    branch_id: '',
    brand: 'Ektefa ai806 (Face & Fingerprint)',
    ip_address: '192.168.8.',
    port: '443',
    comm_port: '5005',
    comm_key: '12345678',
    status: 'offline'
  });

  // Cloud Logs Dialog state
  const [logsOpen, setLogsOpen] = useState(false);
  const [cloudLogs, setCloudLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, e] = await Promise.all([
        base44.entities.Branch ? base44.entities.Branch.list() : [],
        base44.entities.Employee ? base44.entities.Employee.list() : []
      ]);

      const loadedDevices = getBiometricDevices();
      setDevices(loadedDevices);
      setBranches(b || []);
      setEmployees(e || []);
    } catch (err) {
      console.error('Error loading devices:', err);
      setDevices(getBiometricDevices());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: 'تم نسخ النص بنجاح 📋', description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowKey = (id) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Test single device connection (فحص اتصال فعلي لجهاز محدد)
  const handleTestDevice = async (dev) => {
    setTestingId(dev.id);
    try {
      const result = await testDeviceConnection(dev);
      const updatedDevices = devices.map(d => {
        if (d.id === dev.id) {
          return {
            ...d,
            status: result.status,
            last_ping_time: result.latency,
            last_tested_at: new Date().toISOString()
          };
        }
        return d;
      });

      setDevices(updatedDevices);
      saveBiometricDevices(updatedDevices);

      if (result.success) {
        toast({
          title: `نجح فحص الاتصال بجهاز (${dev.name}) ✓`,
          description: result.message,
          className: 'bg-emerald-950/90 text-emerald-100 border-emerald-700'
        });
      } else {
        toast({
          title: `تعذر الاتصال بجهاز (${dev.name}) ✕`,
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: `خطأ في اختبار الاتصال بالجهاز`,
        description: e.message || 'حدث خطأ غير متوقع أثناء فحص الشبكة',
        variant: 'destructive'
      });
    } finally {
      setTestingId(null);
    }
  };

  // Test all devices sequentially (فحص اتصال جميع الأجهزة)
  const handleTestAllDevices = async () => {
    setTestingAll(true);
    let onlineCount = 0;
    let offlineCount = 0;
    const updatedList = [...devices];

    for (let i = 0; i < updatedList.length; i++) {
      const dev = updatedList[i];
      setTestingId(dev.id);
      const res = await testDeviceConnection(dev);
      updatedList[i] = {
        ...dev,
        status: res.status,
        last_ping_time: res.latency,
        last_tested_at: new Date().toISOString()
      };
      if (res.success) onlineCount++;
      else offlineCount++;
    }

    setDevices(updatedList);
    saveBiometricDevices(updatedList);
    setTestingId(null);
    setTestingAll(false);

    toast({
      title: 'اكتمل فحص اتصال جميع الأجهزة 📡',
      description: `الأجهزة المتصلة: ${onlineCount} | الأجهزة غير المتصلة: ${offlineCount}`,
      className: onlineCount > 0 ? 'bg-slate-900 text-white border-primary' : ''
    });
  };

  // Dispatch live pull command to remote cloud device (طلب سحب الحركات من الجهاز)
  const handleTriggerDevicePull = async (dev) => {
    setPullingId(dev.id);
    try {
      const res = await requestDevicePull(dev.serial_number);
      toast({
        title: 'تم إرسال أمر سحب الحركات السحابي ⚡',
        description: `تم توجيه الأمر (C:101:DATA QUERY ATTLOG) للجهاز (${dev.serial_number}). عند أول نبضة سيتولى الجهاز تفريغ سجلات الحركات على السحابة.`
      });

      // Automatically attempt sync right after
      await handleCloudSyncAll();
    } catch (e) {
      toast({
        title: 'تعذر إرسال أمر السحب السحابي',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setPullingId(null);
    }
  };

  // Sync cloud punches from Hostinger ADMS receiver into attendance logs
  const handleCloudSyncAll = async () => {
    setSyncingCloud(true);
    try {
      const res = await syncCloudAttendanceLogs(employees);
      if (res.success) {
        if (res.importedCount > 0) {
          toast({
            title: `تم سحب ومزامنة الحركات السحابية بنجاح ✓`,
            description: `تم استيراد وتحديث ${res.importedCount} حركة حضور وانصراف من خادم ADMS السحابي.`,
            className: 'bg-emerald-950/90 text-emerald-100 border-emerald-700'
          });
        } else if (res.totalOnServer > 0) {
          toast({
            title: 'سجلات الحركات متطابقة بالفعل ✓',
            description: `جميع الحركات المسجلة على الخادم (${res.totalOnServer} حركة) موجودة مسبقاً في النظام ومحدثة.`
          });
        } else {
          toast({
            title: 'جاهزية السيرفر السحابي (0 حركات جديدة حالياً)',
            description: `السيرفر السحابي متصل ويعمل. بانتظار قيام الموظفين بتسجيل بصماتهم أو إتمام تفريغ ذاكرة الجهاز.`
          });
        }

        // Update local device total punches if matching
        const updated = devices.map(d => {
          if (d.serial_number === 'EK0201000043' || d.id === 'dev_main_01') {
            return {
              ...d,
              status: 'online',
              total_punches_synced: res.totalOnServer,
              last_sync: `سحابي (${res.totalOnServer} حركة مسجلة)`
            };
          }
          return d;
        });
        setDevices(updated);
        saveBiometricDevices(updated);
      } else {
        toast({
          title: 'فشل مزامنة السحابة',
          description: res.error || 'تعذر الاتصال بخادم ADMS',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'خطأ أثناء المزامنة',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingCloud(false);
    }
  };

  // Fetch live server logs for debugging
  const handleOpenLogs = async () => {
    setLogsOpen(true);
    setLoadingLogs(true);
    try {
      const res = await fetch('https://gold-hare-970225.hostingersite.com/api/adms_sync.php?logs=1', { cache: 'no-store' });
      const data = await res.json();
      setCloudLogs(data.recent_logs || []);
    } catch (e) {
      console.error('Error fetching cloud logs:', e);
      setCloudLogs(['تعذر جلب السجلات المباشرة: ' + e.message]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setDeviceForm({
      name: '',
      serial_number: 'EK' + Math.floor(1000000000 + Math.random() * 9000000000),
      branch_id: branches[0]?.id || '',
      brand: 'Ektefa ai806 (Face & Fingerprint)',
      ip_address: '192.168.1.111',
      port: '443',
      comm_port: '5005',
      comm_key: '12345678',
      status: 'offline'
    });
    setFormOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceForm.name || !deviceForm.serial_number) {
      toast({ title: 'يرجى إدخال اسم ورقم الجهاز التسلسلي', variant: 'destructive' });
      return;
    }
    const branch = branches.find(b => b.id === deviceForm.branch_id);
    const newDev = {
      ...deviceForm,
      id: editingDevice ? editingDevice.id : 'dev_' + Date.now(),
      branch_name: branch ? branch.name : (deviceForm.branch_name || 'الفرع الرئيسي'),
      last_sync: editingDevice?.last_sync || 'غير متصل - تم الحفظ حديثاً',
      total_punches_synced: editingDevice?.total_punches_synced || 0,
      api_endpoint: 'https://gold-hare-970225.hostingersite.com/api/adms/push'
    };

    let updated;
    if (editingDevice) {
      updated = devices.map(d => d.id === editingDevice.id ? newDev : d);
    } else {
      updated = [newDev, ...devices];
    }
    setDevices(updated);
    saveBiometricDevices(updated);
    setFormOpen(false);
    toast({ title: editingDevice ? 'تم تعديل إعدادات الجهاز بنجاح ✓' : 'تمت إضافة جهاز البصمة بنجاح ✓' });
  };

  const handleDeleteDevice = (dev) => {
    if (!confirm(`هل أنت متأكد من حذف ${dev.name}؟`)) return;
    const filtered = devices.filter(d => d.id !== dev.id);
    setDevices(filtered);
    saveBiometricDevices(filtered);
    toast({ title: 'تم حذف الجهاز بنجاح' });
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground flex items-center gap-2.5">
            <Fingerprint className="w-7 h-7 text-primary" />
            <span>أجهزة البصمة والربط السحابي (ADMS Cloud & Hardware)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            متابعة حالة اتصال الأجهزة الحقيقية (أونلاين / أوفلاين)، سحب الحركات سحابياً عبر ADMS، وفحص الاتصال الفعلي
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleCloudSyncAll}
            disabled={syncingCloud}
            variant="outline"
            className="border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold gap-1.5 h-10 shadow-sm"
          >
            <Download className={`w-4 h-4 text-emerald-600 ${syncingCloud ? 'animate-bounce' : ''}`} />
            <span>{syncingCloud ? 'جاري سحب الحركات...' : 'سحب الحركات سحابياً (ADMS Pull)'}</span>
          </Button>

          <Button
            onClick={handleTestAllDevices}
            disabled={testingAll}
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1.5 h-10 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
            <span>{testingAll ? 'جاري فحص الأجهزة...' : 'فحص اتصال جميع الأجهزة 📡'}</span>
          </Button>

          <Button
            onClick={handleOpenLogs}
            variant="outline"
            className="border-border text-foreground hover:bg-secondary font-bold gap-1.5 h-10"
            title="سجل الاتصالات المباشرة بين الأجهزة والسحابة"
          >
            <Terminal className="w-4 h-4 text-indigo-500" />
            <span>سجل اتصال السحابة (Logs)</span>
          </Button>

          <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground font-bold shadow-md h-10 gap-1.5">
            <Plus className="w-4 h-4" />
            <span>إضافة جهاز جديد</span>
          </Button>
        </div>
      </div>

      {/* Cloud Integration Instructions Banner */}
      <Card className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/30 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-md">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-foreground">بيانات الربط السحابي في شاشة الجهاز (Cloud Server / ADMS):</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ادخل إلى شاشة الجهاز بالفرع: <span className="font-bold text-foreground">القائمة &gt; الاتصالات &gt; إعدادات خادم السحابة (ADMS)</span> واضبط ما يلي:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-card px-3.5 py-2 rounded-xl border text-xs font-mono font-bold text-foreground shadow-sm flex items-center gap-2">
              <span className="text-muted-foreground font-sans text-[11px]">Server:</span>
              <span className="text-primary font-bold">gold-hare-970225.hostingersite.com</span>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard('gold-hare-970225.hostingersite.com', 'server_host')}>
                {copiedKey === 'server_host' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </Button>
            </div>

            <div className="bg-card px-3.5 py-2 rounded-xl border text-xs font-mono font-bold text-foreground shadow-sm flex items-center gap-2">
              <span className="text-muted-foreground font-sans text-[11px]">Port:</span>
              <span className="text-emerald-600 font-bold">443 (أو 80)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-secondary animate-pulse" />)
        ) : devices.map((dev) => {
          const isOnline = dev.status === 'online';
          const isCurrentlyTesting = testingId === dev.id;
          const isCurrentlyPulling = pullingId === dev.id;
          const isCloudDevice = dev.serial_number === 'EK0201000043' || dev.id === 'dev_main_01';

          return (
            <Card
              key={dev.id}
              className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${isOnline
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-500/5 via-card to-card hover:shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300'
                }`}
            >
              <div>
                {/* Card Top: Title, Branch, LED Status Light, Edit/Delete */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Device Icon with Status Badge Ring */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${isOnline
                        ? 'bg-emerald-500/15 text-emerald-600 ring-2 ring-emerald-500/30 shadow-inner'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700'
                      }`}>
                      <Fingerprint className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="font-heading font-black text-base text-foreground leading-snug">{dev.name}</h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-secondary/80 text-foreground border-border">
                          <Building2 className="w-3 h-3 me-1 text-primary" />
                          {dev.branch_name || 'الفرع الرئيسي'}
                        </Badge>

                        {/* Real-time Status Indicator with Pulsing LED */}
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse" />
                            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                            <span>متصل فعلياً (Online)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                            <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>غير متصل (Offline)</span>
                          </span>
                        )}

                        {isCloudDevice && (
                          <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30">
                            ربط سحابي ADMS
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingDevice(dev); setDeviceForm({ ...dev }); setFormOpen(true); }}
                      className="h-8 w-8 hover:bg-secondary rounded-lg"
                      title="تعديل بيانات الجهاز"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDevice(dev)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      title="حذف الجهاز"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Connection Specs Box */}
                <div className="mt-4 bg-secondary/30 p-3.5 rounded-xl border border-border/50 space-y-2 text-xs">
                  {/* Internal LAN IP Address & Port */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Network className="w-3.5 h-3.5 text-primary" />
                      <span>العنوان الداخلي للجهاز (LAN IP):</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span className="text-primary">{dev.ip_address || dev.ip || (isCloudDevice ? '192.168.1.111' : '192.168.8.110')}</span>
                      <span className="text-muted-foreground">:</span>
                      <span className="text-emerald-600 font-bold">{dev.port || (isCloudDevice ? '443' : '80')}</span>
                      {dev.comm_port && dev.comm_port !== dev.port && (
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">
                          (Comm: {dev.comm_port})
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => copyToClipboard(`${dev.ip_address || dev.ip || (isCloudDevice ? '192.168.1.111' : '192.168.8.110')}:${dev.port || (isCloudDevice ? '443' : '80')}`, `ip_${dev.id}`)}
                        title="نسخ الآي بي والمنفذ الداخلي"
                      >
                        {copiedKey === `ip_${dev.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* Cloud Server Address & Port (for cloud-connected devices) */}
                  {isCloudDevice && (
                    <div className="flex items-center justify-between bg-emerald-500/5 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                        <Server className="w-3.5 h-3.5 text-emerald-600" />
                        <span>سيرفر السحابة (ADMS Server):</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-bold">
                        <span className="text-primary text-[11px]">gold-hare-970225.hostingersite.com</span>
                        <span className="text-muted-foreground">:</span>
                        <span className="text-emerald-600 font-bold">443</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard('gold-hare-970225.hostingersite.com', `cloud_${dev.id}`)}
                          title="نسخ عنوان سيرفر السحابة"
                        >
                          {copiedKey === `cloud_${dev.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Serial Number */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                      <span>الرقم التسلسلي (SN):</span>
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                      <span>{dev.serial_number || dev.serial}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => copyToClipboard(dev.serial_number || dev.serial, `sn_${dev.id}`)}
                      >
                        {copiedKey === `sn_${dev.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* Communication Password / Comm Key */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      <span>كلمة مرور الاتصال (Comm Key):</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span>{showKeys[dev.id] ? (dev.comm_key || '12345678') : '••••••••'}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => toggleShowKey(dev.id)}
                        title={showKeys[dev.id] ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showKeys[dev.id] ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => copyToClipboard(dev.comm_key || '12345678', `key_${dev.id}`)}
                      >
                        {copiedKey === `key_${dev.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* Brand & Model */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">طراز وموديل الجهاز:</span>
                    <span className="font-bold text-foreground">{dev.brand || 'Ektefa ai806'}</span>
                  </div>

                  {/* Synced Punches Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">سجلات الحركات المسحوبة:</span>
                    <Badge variant={dev.total_punches_synced > 0 ? 'default' : 'secondary'} className="text-[11px] font-mono font-bold">
                      {dev.total_punches_synced ? `${dev.total_punches_synced.toLocaleString('en-US')} حركة متزامنة` : '0 حركات (بانتظار تلقي البصمات)'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card Footer: Real Test Connection & Pull Buttons */}
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(dev.api_endpoint || 'https://gold-hare-970225.hostingersite.com/api/adms_sync.php', `push_${dev.id}`)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    {copiedKey === `push_${dev.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>رابط المزامنة</span>
                  </Button>

                  {dev.last_ping_time && (
                    <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2 py-1 rounded-md">
                      {dev.last_ping_time}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Dedicated Pull Button for Cloud Device */}
                  {isCloudDevice && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriggerDevicePull(dev)}
                      disabled={isCurrentlyPulling || syncingCloud}
                      className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      title="إرسال أمر سحب حركات البصمة المحفوظة في الجهاز"
                    >
                      <Download className={`w-3.5 h-3.5 ${isCurrentlyPulling ? 'animate-bounce' : ''}`} />
                      <span>{isCurrentlyPulling ? 'جاري السحب...' : 'سحب الحركات سحابياً'}</span>
                    </Button>
                  )}

                  {/* Real Test Connection Button */}
                  <Button
                    size="sm"
                    onClick={() => handleTestDevice(dev)}
                    disabled={isCurrentlyTesting}
                    className={`h-8 px-3.5 rounded-xl font-bold text-xs gap-1.5 shadow-sm transition-all ${isOnline
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                  >
                    <Activity className={`w-3.5 h-3.5 ${isCurrentlyTesting ? 'animate-spin' : ''}`} />
                    <span>{isCurrentlyTesting ? 'جاري فحص الاتصال...' : 'فحص الاتصال الفعلي (Ping)'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Device Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md" style={{ direction: 'rtl' }}>
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg">
              {editingDevice ? 'تعديل بيانات جهاز البصمة' : 'إضافة جهاز بصمة جديد للفرع'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>اسم الجهاز / موقع التركيب *</Label>
              <Input
                placeholder="مثال: جهاز بصمة فرع كيا - السليم"
                value={deviceForm.name}
                onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>الفرع التابع له الجهاز</Label>
              <Select
                value={deviceForm.branch_id}
                onValueChange={(v) => {
                  const b = branches.find(item => item.id === v);
                  setDeviceForm(prev => ({ ...prev, branch_id: v, branch_name: b ? b.name : '' }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الرقم التسلسلي للجهاز (SN) *</Label>
                <Input
                  placeholder="EK0201000043"
                  value={deviceForm.serial_number}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, serial_number: e.target.value }))}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label>عنوان الـ IP الداخلي</Label>
                <Input
                  placeholder="192.168.1.111"
                  value={deviceForm.ip_address}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, ip_address: e.target.value }))}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>منفذ الخدمة (Port)</Label>
                <Input
                  placeholder="443 أو 80"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, port: e.target.value }))}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label>كلمة مرور الاتصال (Comm Key)</Label>
                <Input
                  placeholder="12345678 أو 0"
                  value={deviceForm.comm_key}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, comm_key: e.target.value }))}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>طراز وموديل الجهاز</Label>
              <Input
                placeholder="مثال: Ektefa ai806 (Face & Fingerprint)"
                value={deviceForm.brand}
                onChange={(e) => setDeviceForm(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveDevice} className="bg-primary text-primary-foreground font-bold">
              حفظ الجهاز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cloud Live Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-2xl" style={{ direction: 'rtl' }}>
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              <span>سجل الاتصالات المباشرة للسحابة (ADMS Server Logs)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              سجل النبضات الفعلي والحركات المستلمة من أجهزة البصمة المتصلة عبر الإنترنت:
            </p>
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-[11px] h-64 overflow-y-auto border border-slate-800 space-y-1.5" dir="ltr">
              {loadingLogs ? (
                <div className="text-center text-slate-400 py-10">جاري قراءة السجلات الحية من السيرفر...</div>
              ) : cloudLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-10">لا توجد سجلات بعد (بانتظار اتصال الجهاز بالسيرفر)</div>
              ) : (
                cloudLogs.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-all leading-relaxed hover:bg-slate-900 px-1 rounded">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenLogs()} disabled={loadingLogs} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>تحديث السجل</span>
            </Button>
            <Button onClick={() => setLogsOpen(false)} className="text-xs">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
