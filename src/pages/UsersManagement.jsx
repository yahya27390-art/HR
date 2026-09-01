import { useState } from 'react';
import { Users, Plus, Mail, ShieldCheck, Trash2, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

// Updated user list with 4 roles
const ROLE_LABELS = {
  owner: '👑 صاحب العمل',
  accountant: '🧾 المحاسب',
  hr: '👥 الموارد البشرية',
  system_admin: '🛡️ مدير النظام',
  employee: '👤 موظف',
};
const initialUsers = [
  { id: 'usr_1', full_name: 'فهد ناصر محمد الجوعي', title: 'المدير العام', email: 'dortalsiarh@gmail.com', role: 'مدير النظام', date: '8/2/2026' },
  { id: 'usr_2', full_name: 'هشام ابوالفضل زغلول', title: 'مدير الحسابات', email: 'hes.ham42@yahoo.com', role: 'محاسب', date: '8/17/2026' },
  { id: 'usr_3', full_name: 'طه محمود المحيميد', title: 'مسئول متجر الكتروني', email: 'taha141318@gmail.com', role: 'موظف', date: '8/17/2026' }
];

export default function UsersManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('hr_flow_users_list');
    return saved ? JSON.parse(saved) : initialUsers;
  });
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('موظف');

  const handleInvite = (e) => {
    e.preventDefault();
    if (!emailInput) {
      toast({ title: 'يرجى إدخال البريد الإلكتروني للمستخدم', variant: 'destructive' });
      return;
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      full_name: emailInput.split('@')[0],
      title: 'مستخدم نظام',
      email: emailInput,
      role: roleInput,
      date: new Date().toLocaleDateString('en-US')
    };
    const updated = [newUser, ...users];
    setUsers(updated);
    localStorage.setItem('hr_flow_users_list', JSON.stringify(updated));
    setEmailInput('');
    toast({ title: 'تم إرسال دعوة الانضمام بنجاح ✉️' });
  };

  const updateRole = (id, newRole) => {
    // If updating current logged-in user, refresh session role too
    try {
      const session = JSON.parse(localStorage.getItem('zenith_auth_user') || 'null');
      const target = users.find(u => u.id === id);
      if (session && target && session.email === target.email) {
        const roleMap = { system_admin: 'system_admin', owner: 'owner', accountant: 'accountant', hr: 'hr', employee: 'employee' };
        session.role = roleMap[newRole] || 'employee';
        localStorage.setItem('zenith_auth_user', JSON.stringify(session));
      }
    } catch(e) {}
    const updated = users.map(u => u.id === id ? { ...u, role: newRole } : u);
    setUsers(updated);
    localStorage.setItem('hr_flow_users_list', JSON.stringify(updated));
    toast({ title: 'تم تحديث صلاحية المستخدم' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} مستخدم مسجل بالنظام</p>
        </div>
      </div>

      {/* Invite User Box */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> إضافة مستخدم جديد
        </h3>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="البريد الإلكتروني" 
            type="email"
            value={emailInput} 
            onChange={(e) => setEmailInput(e.target.value)}
            className="flex-1 rounded-xl h-11"
          />
          <Select value={roleInput} onValueChange={setRoleInput}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl h-11 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system_admin">🛡️ مدير النظام</SelectItem>
              <SelectItem value="owner">👑 صاحب العمل</SelectItem>
              <SelectItem value="accountant">🧾 محاسب</SelectItem>
              <SelectItem value="hr">👥 موارد بشرية</SelectItem>
              <SelectItem value="employee">👤 موظف</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="bg-[#C5A869] text-[#1E1035] hover:bg-[#bfa05d] font-bold h-11 rounded-xl px-6">
            <Send className="w-4 h-4 me-2" /> إرسال دعوة
          </Button>
        </form>

        <div className="p-3 bg-secondary/30 rounded-xl border border-border/40 text-xs text-muted-foreground">
          ℹ️ <span className="font-semibold text-foreground">مدير النظام:</span> كامل الصلاحيات • <span className="font-semibold text-foreground">المدير العام:</span> كل البيانات + الموافقات • <span className="font-semibold text-foreground">المحاسب:</span> الرواتب والحضور • <span className="font-semibold text-foreground">الموظف:</span> بياناته فقط
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-bold text-xs">المستخدم</TableHead>
              <TableHead className="font-bold text-xs">البريد الإلكتروني</TableHead>
              <TableHead className="font-bold text-xs">الدور الحالي</TableHead>
              <TableHead className="font-bold text-xs">تاريخ الإضافة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-secondary/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center">
                      {u.full_name?.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{u.full_name}</p>
                      <span className="text-xs text-muted-foreground">{u.title}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(val) => updateRole(u.id, val)}>
                    <SelectTrigger className="w-36 h-8 text-xs font-semibold rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system_admin">🛡️ مدير النظام</SelectItem>
                      <SelectItem value="accountant">🧾 محاسب</SelectItem>
                      <SelectItem value="employee">👤 موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{u.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
