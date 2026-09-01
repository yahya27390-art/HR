/**
 * Alerts Engine — Auto-calculate document/contract expiry alerts
 * Green Arrow HR
 */

export function calcDocAlerts(employees) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30  = new Date(today.getTime() + 30  * 86400000);
  const in60  = new Date(today.getTime() + 60  * 86400000);
  const in90  = new Date(today.getTime() + 90  * 86400000);

  const alerts = [];

  (employees || []).forEach(emp => {
    if (emp.status !== 'active') return;

    // ID / Iqama expiry
    if (emp.id_expiry_date) {
      const exp = new Date(emp.id_expiry_date);
      const diffDays = Math.ceil((exp - today) / 86400000);

      if (exp < today) {
        alerts.push({
          id: 'doc_expired_' + emp.id,
          type: 'expired',
          severity: 'critical',
          icon: '🔴',
          title: 'وثيقة منتهية!',
          message: emp.full_name + ' — ' + (emp.nationality === 'سعودي' ? 'هوية وطنية' : 'إقامة') + ' انتهت منذ ' + Math.abs(diffDays) + ' يوم',
          employee_id: emp.id,
          employee_name: emp.full_name,
          doc_type: emp.nationality === 'سعودي' ? 'national_id' : 'iqama',
          expiry_date: emp.id_expiry_date,
          days: diffDays,
          link: '/employees/' + emp.id,
        });
      } else if (exp <= in30) {
        alerts.push({
          id: 'doc_expiring30_' + emp.id,
          type: 'expiring_soon',
          severity: 'high',
          icon: '🟡',
          title: 'تنتهي خلال ' + diffDays + ' يوم',
          message: emp.full_name + ' — ' + (emp.nationality === 'سعودي' ? 'هوية وطنية' : 'إقامة'),
          employee_id: emp.id,
          employee_name: emp.full_name,
          doc_type: emp.nationality === 'سعودي' ? 'national_id' : 'iqama',
          expiry_date: emp.id_expiry_date,
          days: diffDays,
          link: '/employees/' + emp.id,
        });
      } else if (exp <= in60) {
        alerts.push({
          id: 'doc_expiring60_' + emp.id,
          type: 'expiring_60',
          severity: 'medium',
          icon: '🟠',
          title: 'تنتهي خلال ' + diffDays + ' يوم',
          message: emp.full_name + ' — ' + (emp.nationality === 'سعودي' ? 'هوية وطنية' : 'إقامة'),
          employee_id: emp.id,
          employee_name: emp.full_name,
          doc_type: emp.nationality === 'سعودي' ? 'national_id' : 'iqama',
          expiry_date: emp.id_expiry_date,
          days: diffDays,
          link: '/employees/' + emp.id,
        });
      } else if (exp <= in90) {
        alerts.push({
          id: 'doc_expiring90_' + emp.id,
          type: 'expiring_90',
          severity: 'low',
          icon: '🔵',
          title: 'تنتهي خلال ' + diffDays + ' يوم',
          message: emp.full_name + ' — ' + (emp.nationality === 'سعودي' ? 'هوية وطنية' : 'إقامة'),
          employee_id: emp.id,
          employee_name: emp.full_name,
          doc_type: emp.nationality === 'سعودي' ? 'national_id' : 'iqama',
          expiry_date: emp.id_expiry_date,
          days: diffDays,
          link: '/employees/' + emp.id,
        });
      }
    }

    // Contract end date
    let meta = {};
    if (emp.manager_name && typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')) {
      try { meta = JSON.parse(emp.manager_name); } catch(e) {}
    }
    if (meta.contract_end_date) {
      const exp = new Date(meta.contract_end_date);
      const diffDays = Math.ceil((exp - today) / 86400000);
      if (exp < today) {
        alerts.push({
          id: 'contract_expired_' + emp.id,
          type: 'contract_expired',
          severity: 'high',
          icon: '📋',
          title: 'عقد منتهٍ!',
          message: emp.full_name + ' — العقد انتهى منذ ' + Math.abs(diffDays) + ' يوم',
          employee_id: emp.id, employee_name: emp.full_name,
          doc_type: 'contract', expiry_date: meta.contract_end_date,
          days: diffDays, link: '/employees/' + emp.id,
        });
      } else if (exp <= in30) {
        alerts.push({
          id: 'contract_expiring_' + emp.id,
          type: 'contract_expiring',
          severity: 'medium',
          icon: '📋',
          title: 'عقد سينتهي خلال ' + diffDays + ' يوم',
          message: emp.full_name,
          employee_id: emp.id, employee_name: emp.full_name,
          doc_type: 'contract', expiry_date: meta.contract_end_date,
          days: diffDays, link: '/employees/' + emp.id,
        });
      }
    }
  });

  return alerts.sort((a, b) => a.days - b.days);
}

export function getAlertCountBySeverity(alerts) {
  return {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high:     alerts.filter(a => a.severity === 'high').length,
    medium:   alerts.filter(a => a.severity === 'medium').length,
    low:      alerts.filter(a => a.severity === 'low').length,
    total:    alerts.length,
  };
}

export function getAlertsForEmployee(alerts, employeeId) {
  return alerts.filter(a => a.employee_id === employeeId);
}
