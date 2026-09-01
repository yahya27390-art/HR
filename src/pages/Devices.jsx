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
  Server
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function Devices() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    serial_number: '',
    branch_id: '',
    brand: 'ZKTeco',
    ip_address: '192.168.1.201',
    status: 'online'
  });

  // Simulator states
  const [simOpen, setSimOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [punchType, setPunchType] = useState('check_in');

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, b, e] = await Promise.all([
        base44.entities.BiometricDevice ? base44.entities.BiometricDevice.list() : [],
        base44.entities.Branch.list(),
        base44.entities.Employee.list()
      ]);

            const initialDevices = [
        {
          id: 'dev_kia_01',
          name: 'جهاز بصمة فرع كيا (Ektefa AI Face & Fingerprint)',
          serial_number: 'EK0201000044',
          branch_id: 'br_kia',
          branch_name: 'فرع كيا',
          brand: 'Ektefa ai806 (Face / Fingerprint / Card)',
          ip_address: '192.168.8.81',
          port: '5005',
          firmware: 'ai806_fp50v_v5.13',
          status: 'online',
          last_sync: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          api_endpoint: 'https://gold-hare-970225.hostingersite.com/api/adms/push'
        },
        {
          id: 'dev_main_01',
          name: 'جهاز بصمة الإدارة العامة والفرع الرئيسي',
          serial_number: 'ZK-ADMS-998821',
          branch_id: 'br_main',
          branch_name: 'الفرع الرئيسي',
          brand: 'ZKTeco ProFace X',
          ip_address: '192.168.1.201',
          port: '5005',
          status: 'online',
          last_sync: '10:45 ص',
          api_endpoint: 'https://gold-hare-970225.hostingersite.com/api/adms/push'
        },
        {
          id: 'dev_hyundai_01',
          name: 'جهاز بصمة فرع هونداي',
          serial_number: 'EK0201000045',
          branch_id: 'br_hyundai',
          branch_name: 'فرع هونداي',
          brand: 'Ektefa ai806 (Face & Fingerprint)',
          ip_address: '192.168.8.82',
          port: '5005',
          status: 'online',
          last_sync: '11:00 ص',
          api_endpoint: 'https://gold-hare-970225.hostingersite.com/api/adms/push'
        }
      ];

      setDevices(d && d.length > 0 ? d : initialDevices);
      setBranches(b || []);
      setEmployees(e || []);
      if (e && e.length > 0) setSelectedEmp(e[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: 'تم نسخ الرابط السحابي بنجاح 📋' });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setDeviceForm({
      name: '',
      serial_number: 'ZK-' + Math.floor(100000 + Math.random() * 900000),
      branch_id: branches[0]?.id || '',
      brand: 'ZKTeco',
      ip_address: '192.168.1.' + Math.floor(200 + Math.random() * 50),
      status: 'online'
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
      branch_name: branch ? branch.name : 'الفرع الرئيسي',
      last_sync: 'الآن',
      api_endpoint: 'https://gold-hare-970225.hostingersite.com/api/adms/push'
    };

    let updated;
    if (editingDevice) {
      updated = devices.map(d => d.id === editingDevice.id ? newDev : d);
    } else {
      updated = [newDev, ...devices];
    }
    setDevices(updated);
    localStorage.setItem('hr_flow_BiometricDevice', JSON.stringify(updated));
    setFormOpen(false);
    toast({ title: editingDevice ? 'تم تعديل إعدادات الجهاز بنجاح' : 'تمت إضافة جهاز البصمة بنجاح' });
  };

  const handleDeleteDevice = (dev) => {
    if (!confirm(`هل أنت متأكد من حذف ${dev.name}؟`)) return;
    const filtered = devices.filter(d => d.id !== dev.id);
    setDevices(filtered);
    localStorage.setItem('hr_flow_BiometricDevice', JSON.stringify(filtered));
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
      employee_name: emp.full_name,
      log_date: now.toISOString().split('T')[0],
      check_in: punchType === 'check_in' ? timeStr : null,
      check_out: punchType === 'check_out' ? timeStr : null,
      status: isLate ? 'late' : 'present',
      notes: `تم التسجيل تلقائياً عبر جهاز بصمة ADMS (${devices[0]?.name || 'ZKTeco'})`
    };

    await base44.entities.AttendanceLog.create(newLog);
    setSimOpen(false);
    toast({ 
      title: `تم تسجيل بصمة ${emp.full_name} بنجاح!`, 
      description: `النوع: ${punchType === 'check_in' ? 'تسجيل دخول' : 'تسجيل خروج'} في تمام الساعة ${timeStr}`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">أجهزة البصمة والربط السحابي (ADMS Cloud Push)</h1>
          <p className="text-sm text-muted-foreground mt-1">ربط أجهزة ZKTeco و Hikvision بالفروع واستقبال البصمات لحظياً</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSimOpen(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            <Play className="w-4 h-4 me-2" /> تجربة إرسال بصمة (محاكي)
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4 me-2" /> إضافة جهاز بصمة
          </Button>
        </div>
      </div>

      {/* Cloud Integration Instructions Banner */}
      <Card className="p-6 border-primary/20 bg-primary/5 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">بيانات الربط في شاشة جهاز البصمة (Cloud Server / ADMS):</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ادخل إلى: <span className="font-semibold text-foreground">Menu &gt; Comm. &gt; Cloud Server / ADMS</span> في جهاز البصمة بالفرع واكتب:
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-card px-3.5 py-2 rounded-xl border text-xs font-mono font-bold text-foreground">
              Server: <span className="text-primary">gold-hare-970225.hostingersite.com</span>
            </div>
            <div className="bg-card px-3.5 py-2 rounded-xl border text-xs font-mono font-bold text-foreground">
              Port: <span className="text-emerald-600">443 (HTTPS)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-secondary animate-pulse" />)
        ) : devices.map((dev) => (
          <Card key={dev.id} className="p-6 border-border/60 shadow-sm rounded-2xl relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{dev.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs font-semibold bg-secondary/60">
                      {dev.branch_name || 'الفرع الرئيسي'}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      متصل سحابياً (Online)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditingDevice(dev); setDeviceForm(dev); setFormOpen(true); }} className="hover:bg-secondary">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(dev)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs bg-secondary/30 p-3.5 rounded-xl border border-border/40 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الرقم التسلسلي (SN):</span>
                <span className="font-mono font-bold text-foreground">{dev.serial_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">موديل الجهاز:</span>
                <span className="text-foreground">{dev.brand || 'ZKTeco ADMS'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">آخر مزامنة للبصمات:</span>
                <span className="text-emerald-600 font-bold">{dev.last_sync || 'الآن'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">رابط الاستقبال السحابي (Push URL):</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(dev.api_endpoint || 'https://gold-hare-970225.hostingersite.com/api/adms/push', dev.id)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {copiedKey === dev.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === dev.id ? 'تم النسخ' : 'نسخ الرابط'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Device Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'تعديل جهاز البصمة' : 'إضافة جهاز بصمة جديد للفرع'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم الجهاز / موقع التركيب *</Label>
              <Input placeholder="مثال: جهاز بصمة بوابة الموظفين" value={deviceForm.name} onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>الفرع التابع له الجهاز</Label>
              <Select value={deviceForm.branch_id} onValueChange={(v) => setDeviceForm(prev => ({ ...prev, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>الرقم التسلسلي للجهاز (Serial Number / SN) *</Label>
              <Input placeholder="مثال: ZK-99882144" value={deviceForm.serial_number} onChange={(e) => setDeviceForm(prev => ({ ...prev, serial_number: e.target.value }))} className="font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label>موديل وماركة الجهاز</Label>
              <Input placeholder="مثال: ZKTeco MB20 / ProFace X" value={deviceForm.brand} onChange={(e) => setDeviceForm(prev => ({ ...prev, brand: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveDevice} className="bg-primary text-primary-foreground">حفظ الجهاز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulator Dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>محاكي إرسال البصمات السحابي (Cloud Push Tester)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              يمكنك تجربة إرسال بصمة تجريبية كأن الجهاز أرسلها الآن لمشاهدة تسجيل الحضور فورياً في النظام:
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimOpen(false)}>إلغاء</Button>
            <Button onClick={handleSimulatePunch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              إرسال البصمة الآن 🚀
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
