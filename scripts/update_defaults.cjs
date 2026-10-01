const fs = require('fs');

let content = fs.readFileSync('src/api/base44Client.js', 'utf8');

const defaults = {
  '1001': { ent: 21, con: 0, pol: 'الاجازة السنوية (21 يوم)' },
  '1034': { ent: 0, con: 0, pol: 'اجازات بدون مرتب' },
  '1013': { ent: 21, con: 0, pol: 'الاجازة السنوية (21 يوم)' },
  '1027': { ent: 0, con: 0, pol: 'اجازات بدون مرتب' },
  '1032': { ent: 21, con: 0, pol: 'الاجازة السنوية (21 يوم)' },
  '1033': { ent: 21, con: 0, pol: 'الاجازة السنوية (21 يوم)' },
  '1035': { ent: 0, con: 0, pol: 'اجازات بدون مرتب' },
};

for (const [num, d] of Object.entries(defaults)) {
  const blockStart = `employee_number: '${num}',`;
  const pos = content.indexOf(blockStart);
  if (pos === -1) continue;
  const nextClosing = content.indexOf('status: \'active\'', pos);
  if (nextClosing === -1) continue;
  
  let sub = content.substring(pos, nextClosing);
  if (!sub.includes('annual_leave_entitlement')) {
    sub = sub.replace(/leave_policy:\s*'[^']+',/, `leave_policy: '${d.pol}',\n      annual_leave_entitlement: ${d.ent},\n      opening_consumed_leaves: ${d.con},`);
    content = content.substring(0, pos) + sub + content.substring(nextClosing);
  }
}

fs.writeFileSync('src/api/base44Client.js', content, 'utf8');
console.log('Successfully added defaults for all other employees!');
