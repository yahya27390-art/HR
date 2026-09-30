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
  Play, 
  Sliders, 
  Building2, 
  Clock, 
  ShieldCheck,
  Server,
  Activity,
  Key,
  Network,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Radio
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
  testDeviceConnection 
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
    port: '80',
    comm_port: '5005',
    comm_key: '12345678',
    status: 'offline'
  });

  // Simulator states
  const [simOpen, setSimOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [punchType, setPunchType] = useState('check_in');

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
      if (e && e.length > 0) setSelectedEmp(e[0].id);
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
          title: `نجح الاتصال الفعلي بجهاز (${dev.name}) ✓`,
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
      description: `الأجهزة المتصلة أونلاين: ${onlineCount} | الأجهزة غير المتصلة: ${offlineCount}`,
      className: onlineCount > 0 ? 'bg-slate-900 text-white border-primary' : ''
    });
  };

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setDeviceForm({
      name: '',
      serial_number: 'EK' + Math.floor(1000000000 + Math.random() * 9000000000),
      branch_id: branches[0]?.id || '',
      brand: 'Ektefa ai806 (Face & Fingerprint)',
      ip_address: '192.168.8.',
      port: '80',
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

  // Simulate Cloud Push Punch from machine
  const handleSimulatePunch = async () => {
    const emp = employees.find(e => e.id === selectedEmp);
    if (!emp) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const isLate = timeStr > '08:15' && punchType === 'check_in';

    const newLog = {
      id: 'att_' + Date.now(),
      employee_id: emp.id,
      employee_number: emp.employee_number || emp.id,
      employee_name: emp.full_name,
      log_date: now.toISOString().split('T')[0],
      check_in: punchType === 'check_in' ? timeStr : null,
      check_out: punchType === 'check_out' ? timeStr : null,
      status: isLate ? 'late' : 'present',
      notes: `تم التسجيل تلقائياً عبر جهاز بصمة ADMS (${devices[0]?.name || 'Ektefa'})`
    };

    if (base44.entities.AttendanceLog) {
      await base44.entities.AttendanceLog.create(newLog);
    }
    setSimOpen(false);
    toast({ 
      title: `تم تسجيل بصمة ${emp.full_name} بنجاح!`, 
      description: `النوع: ${punchType === 'check_in' ? 'تسجيل حضور' : 'تسجيل خروج'} في تمام الساعة ${timeStr}`
    });
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
            متابعة حالة اتصال الأجهزة الحقيقية (أونلاين / أوفلاين)، فحص الاتصال الفعلي، وبيانات الشبكة والـ ADMS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleTestAllDevices} 
            disabled={testingAll}
            variant="outline" 
            className="border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1.5 h-10 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
            <span>{testingAll ? 'جاري فحص جميع الأجهزة...' : 'فحص اتصال جميع الأجهزة 📡'}</span>
          </Button>

          <Button onClick={() => setSimOpen(true)} variant="outline" className="border-border text-foreground hover:bg-secondary font-bold gap-1.5 h-10">
            <Play className="w-4 h-4 text-emerald-600" />
            <span>محاكي إرسال بصمة</span>
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
                ادخل إلى قائمة الجهاز بالفرع: <span className="font-bold text-foreground">Menu &gt; Comm. &gt; Cloud Server / ADMS</span> واضبط الإعدادات التالية:
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
              <span className="text-emerald-600 font-bold">443 (HTTPS)</span>
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

          return (
            <Card 
              key={dev.id} 
              className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                isOnline 
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-500/5 via-card to-card hover:shadow-md' 
                  : 'border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300'
              }`}
            >
              <div>
                {/* Card Top: Title, Branch, LED Status Light, Edit/Delete */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Device Icon with Status Badge Ring */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                      isOnline 
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
                  {/* IP Address & Port */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-primary" />
                      <span>عنوان الـ IP الداخلي والمنفذ:</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span className="text-primary">{dev.ip_address || dev.ip || '192.168.8.110'}</span>
                      <span className="text-muted-foreground">:</span>
                      <span className="text-emerald-600 font-bold">{dev.port || '80'}</span>
                      {dev.comm_port && dev.comm_port !== dev.port && (
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">
                          (Comm: {dev.comm_port})
                        </span>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5" 
                        onClick={() => copyToClipboard(`${dev.ip_address || dev.ip}:${dev.port || 80}`, `ip_${dev.id}`)}
                      >
                        {copiedKey === `ip_${dev.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

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
                      {dev.total_punches_synced ? `${dev.total_punches_synced.toLocaleString('en-US')} حركة متزامنة` : '0 حركات (بانتظار الربط)'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card Footer: Real Test Connection Button & Push URL */}
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(dev.api_endpoint || 'https://gold-hare-970225.hostingersite.com/api/adms/push', `push_${dev.id}`)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    {copiedKey === `push_${dev.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ رابط Push</span>
                  </Button>
                  
                  {dev.last_ping_time && (
                    <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2 py-1 rounded-md">
                      {dev.last_ping_time}
                    </span>
                  )}
                </div>

                {/* Real Test Connection Button */}
                <Button
                  size="sm"
                  onClick={() => handleTestDevice(dev)}
                  disabled={isCurrentlyTesting}
                  className={`h-8 px-3.5 rounded-xl font-bold text-xs gap-1.5 shadow-sm transition-all ${
                    isOnline
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                >
                  <Activity className={`w-3.5 h-3.5 ${isCurrentlyTesting ? 'animate-spin' : ''}`} />
                  <span>{isCurrentlyTesting ? 'جاري فحص الاتصال...' : 'فحص الاتصال الفعلي (Ping)'}</span>
                </Button>
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
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>عنوان الـ IP الداخلي *</Label>
                <Input 
                  placeholder="192.168.8.110" 
                  value={deviceForm.ip_address} 
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, ip_address: e.target.value }))} 
                  className="font-mono text-left" 
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label>منفذ الويب / API (Port)</Label>
                <Input 
                  placeholder="80 أو 5005" 
                  value={deviceForm.port} 
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, port: e.target.value }))} 
                  className="font-mono text-left" 
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الرقم التسلسلي (SN) *</Label>
                <Input 
                  placeholder="مثال: EK0201000044" 
                  value={deviceForm.serial_number} 
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, serial_number: e.target.value }))} 
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

      {/* Simulator Dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-md" style={{ direction: 'rtl' }}>
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg">
              محاكي إرسال البصمات السحابي (Cloud Push Tester)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              يمكنك تجربة إرسال حركة بصمة كأن الجهاز المتصل أرسلها الآن لمشاهدة تسجيل الحضور فورياً في النظام:
            </p>

            <div className="space-y-1.5">
              <Label>اختر الموظف</Label>
              <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>نوع البصمة</Label>
              <Select value={punchType} onValueChange={setPunchType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check_in">تسجيل حضور (Check-In)</SelectItem>
                  <SelectItem value="check_out">تسجيل انصراف (Check-Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSimOpen(false)}>إلغاء</Button>
            <Button onClick={handleSimulatePunch} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              إرسال البصمة الآن 🚀
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
