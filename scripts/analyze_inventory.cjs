const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ملفات تقارير الحملات', 'حركة مخزن الى شهر 9 2026.xlsx');
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets['ورقة1'];

// Sheet_to_json with raw rows
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
console.log('Total JSON objects:', rows.length);

console.log('\n--- First 10 mapped rows ---');
console.log(JSON.stringify(rows.slice(0, 10), null, 2));

// Summary statistics
let totalIssued = 0;
let totalReceived = 0;
let totalBalance = 0;
let totalOpening = 0;
let activeStockCount = 0;
let itemsWithSales = 0;

for (const row of rows) {
  const opening = Number(row['الرصيد الإفتتاحي'] || 0) || 0;
  const received = Number(row['الكمية الواردة'] || 0) || 0;
  const issued = Number(row['الكمية المنصرفة'] || 0) || 0;
  const balance = Number(row['الرصيد'] || 0) || 0;

  totalOpening += opening;
  totalReceived += received;
  totalIssued += issued;
  totalBalance += balance;

  if (balance > 0) activeStockCount++;
  if (issued > 0) itemsWithSales++;
}

console.log('\n=== Aggregate Inventory Metrics ===');
console.log('Total SKUs / Parts:', rows.length);
console.log('Items with Sales Movement (الكمية المنصرفة > 0):', itemsWithSales);
console.log('Items currently in stock (الرصيد > 0):', activeStockCount);
console.log('Total Quantity Sold / Dispatched (إجمالي الكمية المنصرفة):', totalIssued);
console.log('Total Quantity Received (إجمالي الوارد):', totalReceived);
console.log('Total Current Stock Units (إجمالي رصيد المخزون الفعلي):', totalBalance);
