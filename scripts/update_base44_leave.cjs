const fs = require('fs');

let content = fs.readFileSync('src/api/base44Client.js', 'utf8');

// 1. Bump storage version
content = content.replace(
  /const CURRENT_DB_VERSION = '[^']+';/,
  "const CURRENT_DB_VERSION = 'v12_leave_balances_baseline';"
);

// 2. Update LeavePolicy in initialData
const oldLP = `  LeavePolicy: [
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
  ],`;

const newLP = `  LeavePolicy: [
    { 
      id: 'lp_1', 
      name: 'اجازات بدون مرتب', 
      company: 'HR DORAT CARS', 
      annual_days: 0, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 0, 
      emergency_days: 0 
    },
    { 
      id: 'lp_2', 
      name: 'الاجازة السنوية (21 يوم)', 
      company: 'HR DORAT CARS', 
      annual_days: 21, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 30, 
      emergency_days: 5 
    },
    { 
      id: 'lp_3', 
      name: 'الاجازة السنوية (30 يوم)', 
      company: 'HR DORAT CARS', 
      annual_days: 30, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 30, 
      emergency_days: 5 
    }
  ],`;

content = content.replace(oldLP, newLP);

// 3. Mapping for authoritative balances
const balances = {
  '1002': { entitlement: 30, consumed: 11, policy: 'الاجازة السنوية (30 يوم)' },
  '1004': { entitlement: 30, consumed: 11, policy: 'الاجازة السنوية (30 يوم)' },
  '1005': { entitlement: 21, consumed: 0, policy: 'الاجازة السنوية (21 يوم)' },
  '1008': { entitlement: 21, consumed: 9, policy: 'الاجازة السنوية (21 يوم)' },
  '1011': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1015': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب', national_id: '1137284566' },
  '1017': { entitlement: 21, consumed: 3, policy: 'الاجازة السنوية (21 يوم)' },
  '1018': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1020': { entitlement: 21, consumed: 15, policy: 'الاجازة السنوية (21 يوم)' }, // User: 22 -> 21 days!
  '1021': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1022': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1024': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
};

// Process each employee block
for (const [num, b] of Object.entries(balances)) {
  const blockStart = `employee_number: '${num}',`;
  const pos = content.indexOf(blockStart);
  if (pos === -1) {
    console.error(`Could not find employee ${num}`);
    continue;
  }
  const nextClosing = content.indexOf('status: \'active\'', pos);
  if (nextClosing === -1) {
    console.error(`Could not find status for employee ${num}`);
    continue;
  }
  
  let sub = content.substring(pos, nextClosing);
  
  // Replace leave_policy
  sub = sub.replace(/leave_policy:\s*'[^']+',/, `leave_policy: '${b.policy}',\n      annual_leave_entitlement: ${b.entitlement},\n      opening_consumed_leaves: ${b.consumed},`);
  
  // Replace national_id if specified
  if (b.national_id) {
    sub = sub.replace(/national_id:\s*'[^']*',/, `national_id: '${b.national_id}',`);
  }
  
  content = content.substring(0, pos) + sub + content.substring(nextClosing);
}

// 4. Update toDbRecord
content = content.replace(
  "contract_end_date: item.contract_end_date || null",
  "contract_end_date: item.contract_end_date || null,\n      annual_leave_entitlement: item.annual_leave_entitlement !== undefined && item.annual_leave_entitlement !== null ? Number(item.annual_leave_entitlement) : (item.leave_policy === 'اجازات بدون مرتب' ? 0 : (item.leave_policy && item.leave_policy.includes('30') ? 30 : 21)),\n      opening_consumed_leaves: Number(item.opening_consumed_leaves) || 0"
);

content = content.replace(
  "leave_policy: item.leave_policy || 'الاجازة السنوية',",
  "leave_policy: item.leave_policy || 'الاجازة السنوية',\n      annual_leave_entitlement: item.annual_leave_entitlement !== undefined && item.annual_leave_entitlement !== null ? Number(item.annual_leave_entitlement) : (item.leave_policy === 'اجازات بدون مرتب' ? 0 : (item.leave_policy && item.leave_policy.includes('30') ? 30 : 21)),\n      opening_consumed_leaves: Number(item.opening_consumed_leaves) || 0,"
);

// 5. Update fromDbRecord
content = content.replace(
  "shift: row.shift || 'فترة عمل غير سعودي'",
  "shift: row.shift || 'فترة عمل غير سعودي',\n      annual_leave_entitlement: row.annual_leave_entitlement !== undefined && row.annual_leave_entitlement !== null ? Number(row.annual_leave_entitlement) : (meta.annual_leave_entitlement !== undefined ? Number(meta.annual_leave_entitlement) : (row.leave_policy === 'اجازات بدون مرتب' ? 0 : (row.leave_policy && String(row.leave_policy).includes('30') ? 30 : 21))),\n      opening_consumed_leaves: row.opening_consumed_leaves !== undefined && row.opening_consumed_leaves !== null ? Number(row.opening_consumed_leaves) : (Number(meta.opening_consumed_leaves) || 0)"
);

fs.writeFileSync('src/api/base44Client.js', content, 'utf8');
console.log('Successfully updated src/api/base44Client.js with exact balances!');
