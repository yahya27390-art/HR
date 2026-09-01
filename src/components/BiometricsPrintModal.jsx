import { getCompanyProfile } from '@/lib/companyProfile';
import { useRef } from 'react';
import { Printer, Calendar, Clock, Building2, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatMinutes, formatHours, formatTimeDisplay } from '@/lib/payrollEngine';



export default function BiometricsPrintModal({ open, onOpenChange, employee, dailyDetails, monthLabel, payroll }) {
  const printRef = useRef(null);
  if (!employee) return null;

  const company = getCompanyProfile();
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const presentCount = dailyDetails?.filter(d => d.hasAttendance).length || 0;
  const absentCount = dailyDetails?.filter(d => !d.hasAttendance && !d.isExempt && !d.isFriday).length || 0;
  const fridayCount = dailyDetails?.filter(d => d.isFriday && d.hasAttendance).length || 0;
  const totalShortfallMins = dailyDetails?.reduce((sum, d) => sum + (d.shortfallMinutes || 0), 0) || 0;

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف بصمات الدوام — ${employee.full_name} — ${monthLabel}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cairo',Arial,sans-serif; direction:rtl; font-size:11px; color:#1a1a1a; background:#fff; }
          .font-mono { font-family:'JetBrains Mono',monospace; }
          .sheet-body { width:210mm; min-height:297mm; padding:12mm 10mm; margin:0 auto; }
          table { width:100%; border-collapse:collapse; }
          table th, table td { padding:5px 6px; }
          @media print { 
            body { margin:0; } 
            .no-print { display:none !important; }
            .sheet-body { padding:8mm; }
          }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-6 rounded-3xl" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="text-base font-heading font-black text-foreground">
            كشف مراجعة وتدقيق البصمات A4 — {employee.full_name}
          </DialogTitle>
          <Button onClick={handlePrint} size="sm" className="bg-slate-900 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm">
            <Printer className="w-3.5 h-3.5" /> طباعة الكشف A4
          </Button>
        </DialogHeader>

        {/* ─── A4 PRINT CONTAINER ────────────────────────────────────────── */}
        <div
          ref={printRef}
          className="sheet-body bg-white border border-border/60 shadow-lg rounded-2xl overflow-hidden my-2"
          style={{ width: '100%', maxWidth: '794px', margin: '0 auto', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}
        >
          {/* Header Banner */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {company.logo_url && (
                <img src={company.logo_url || "/company-logo.svg"} onError={(e) => { e.currentTarget.src = "/company-logo.svg"; }} alt="logo" style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fff', objectFit: 'contain', padding: '3px' }} />
              )}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '900' }}>{company.legal_name}</div>
                <div style={{ fontSize: '10px', opacity: '0.8', marginTop: '1px', fontFamily: 'monospace' }}>
                  السجل التجاري: {company.cr_number}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#38bdf8' }}>كشف سجل البصمات والدوام</div>
              <div style={{ fontSize: '11px', opacity: '0.9', marginTop: '2px', fontFamily: 'monospace' }}>شهر: {monthLabel}</div>
              <div style={{ fontSize: '9px', opacity: '0.7', fontFamily: 'monospace' }}>تاريخ الاستخراج: {issueDate}</div>
            </div>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Employee Info Card */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px' }}>اسم الموظف:</span>
                <div style={{ fontWeight: '800', color: '#0f172a' }}>{employee.full_name}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px' }}>الرقم الوظيفي:</span>
                <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{employee.employee_number || employee.id}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px' }}>الفرع / القسم:</span>
                <div style={{ fontWeight: '600' }}>{employee.branch_name || employee.department_name || 'الفرع الرئيسي'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px' }}>الوردية المعتمدة:</span>
                <div style={{ fontWeight: '600' }}>{employee.shift || 'فترة عمل غير سعودي'}</div>
              </div>
            </div>

            {/* Monthly Attendance KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', fontSize: '10px' }}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#065f46', fontWeight: '700' }}>أيام الحضور الفعلي</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#047857', fontFamily: 'monospace', marginTop: '2px' }}>{presentCount} يوم</div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#991b1b', fontWeight: '700' }}>أيام الغياب غير المبرر</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#dc2626', fontFamily: 'monospace', marginTop: '2px' }}>{absentCount} يوم</div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#1e40af', fontWeight: '700' }}>جمعات دوام معتمدة</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#2563eb', fontFamily: 'monospace', marginTop: '2px' }}>{fridayCount} جمعة</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#92400e', fontWeight: '700' }}>إجمالي عجز الساعات</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#d97706', fontFamily: 'monospace', marginTop: '2px' }}>{formatMinutes(totalShortfallMins)}</div>
              </div>
            </div>

            {/* Day-by-Day Table */}
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', background: '#f1f5f9', padding: '5px 10px', borderRight: '4px solid #475569', fontSize: '11px', marginBottom: '4px' }}>
                جدول البصمات وساعات الدوام اليومية لشهر {monthLabel}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#0F172A', color: '#fff' }}>
                    <th style={{ padding: '5px 3px' }}>التاريخ</th>
                    <th style={{ padding: '5px 3px' }}>اليوم</th>
                    <th style={{ padding: '5px 3px', background: '#065F46' }}>الفترة النهارية (دخول ➔ خروج)</th>
                    <th style={{ padding: '5px 3px', background: '#1E40AF' }}>الفترة المسائية (دخول ➔ خروج)</th>
                    <th style={{ padding: '5px 3px' }}>الساعات المطلوبة</th>
                    <th style={{ padding: '5px 3px' }}>إجمالي الفعلي</th>
                    <th style={{ padding: '5px 3px' }}>الفارق (عجز / زيادة)</th>
                    <th style={{ padding: '5px 3px' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyDetails?.map((d, idx) => {
                    const statusLabel = d.isFriday 
                      ? 'عطلة جمعة' 
                      : d.isUnpaidLeave 
                      ? 'إجازة بدون راتب' 
                      : d.isExempt 
                      ? 'معفى / إجازة' 
                      : !d.hasAttendance 
                      ? 'غائب' 
                      : d.shortfallMinutes > 0 
                      ? 'عجز دوام' 
                      : 'حاضر ✓';

                    const statusColor = d.isFriday 
                      ? '#4338ca' 
                      : d.isExempt 
                      ? '#64748b' 
                      : !d.hasAttendance 
                      ? '#dc2626' 
                      : d.shortfallMinutes > 0 
                      ? '#d97706' 
                      : '#16a34a';

                    // Morning Period formatting
                    const p1Text = d.hasAttendance 
                      ? (d.period_1_in ? `${d.period_1_in} ➔ ${d.period_1_out || '--:--'}` : (d.check_in ? formatTimeDisplay(d.check_in) : '—'))
                      : '—';

                    // Evening Period formatting
                    const p2Text = d.hasAttendance 
                      ? (d.period_2_in ? `${d.period_2_in} ➔ ${d.period_2_out || '--:--'}` : '—')
                      : '—';

                    // Shortfall vs Surplus
                    let diffText = '0 د ✓';
                    let diffColor = '#16a34a';
                    if (d.shortfallMinutes > 0) {
                      diffText = `-${formatMinutes(d.shortfallMinutes)} 🔻`;
                      diffColor = '#dc2626';
                    } else if (d.surplusMinutes > 0) {
                      diffText = `+${formatMinutes(d.surplusMinutes)} ⚡`;
                      diffColor = '#2563eb';
                    }

                    return (
                      <tr key={d.log_date || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace', fontWeight: '700' }}>{d.log_date}</td>
                        <td style={{ padding: '4px 2px', fontWeight: '600' }}>{d.day_name}</td>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace', fontWeight: '700', color: '#065F46' }}>{p1Text}</td>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace', fontWeight: '700', color: '#1E40AF' }}>{p2Text}</td>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace' }}>{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace', fontWeight: '700' }}>{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                        <td style={{ padding: '4px 2px', fontFamily: 'monospace', fontWeight: '800', color: diffColor }}>
                          {diffText}
                        </td>
                        <td style={{ padding: '4px 2px', fontWeight: '700', color: statusColor }}>{statusLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Verification Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '30px' }}>تدقيق مسؤول شؤون الموظفين والبصمة</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '70%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>التوقيع والتاريخ</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '30px' }}>اعتماد ومصادقة المدير العام</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '70%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>فهد ناصر محمد الجوعي</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              سجل بصمات رسمي مستخرج من منصة Green Arrow HR • {company.legal_name}
            </div>

          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold rounded-xl px-5">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
