const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ملفات تقارير الحملات', 'حركة مخزن الى شهر 9 2026.xlsx');
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets['ورقة1'];

// Sheet_to_json with header: 1
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Header row:', rows[0]);

let totalOpening = 0;
let totalReceived = 0;
let totalIssued = 0;
let totalBalance = 0;
let itemsWithSales = 0;
let itemsInStock = 0;
let mathMismatchCount = 0;

const parsedItems = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 2) continue;

  const sku = String(row[0] || '').trim();
  const name = String(row[1] || '').trim();
  if (!sku && !name) continue;

  const unit = String(row[2] || '').trim();
  const opening = Number(row[3]) || 0;
  const received = Number(row[4]) || 0;
  const issued = Number(row[5]) || 0;
  const balance = Number(row[6]) || 0;

  // Verify accounting formula: Opening + Received - Issued = Balance
  const expectedBalance = opening + received - issued;
  if (Math.abs(expectedBalance - balance) > 0.01 && row.length >= 7) {
    mathMismatchCount++;
  }

  totalOpening += opening;
  totalReceived += received;
  totalIssued += issued;
  totalBalance += balance;

  if (issued > 0) itemsWithSales++;
  if (balance > 0) itemsInStock++;

  parsedItems.push({
    sku,
    name,
    unit,
    opening,
    received,
    issued,
    balance
  });
}

console.log('\n=== Authenticated Real Spare Parts Inventory Audit ===');
console.log('Total Spare Part SKUs:', parsedItems.length);
console.log('Math mismatches (formula integrity):', mathMismatchCount);
console.log('Items with Sales Movement (منصرف > 0):', itemsWithSales);
console.log('Items in Stock (رصيد > 0):', itemsInStock);
console.log('Total Opening Units (الرصيد الافتتاحي):', totalOpening);
console.log('Total Inward Received Units (الوارد):', totalReceived);
console.log('Total Sold / Dispatched Units (المنصرف / المباع):', totalIssued);
console.log('Total Current Warehouse Stock Units (الرصيد المتبقي بالخزينة والمستودعات):', totalBalance);

// Show Top 10 High-Velocity Parts by Units Sold (الكمية المنصرفة)
parsedItems.sort((a, b) => b.issued - a.issued);
console.log('\n--- Top 15 Best-Selling Spare Parts by Volume (الأعلى حركة ومبيعاً) ---');
for (let i = 0; i < 15; i++) {
  const p = parsedItems[i];
  console.log(`${i+1}. [${p.sku}] ${p.name} | مبيعات: ${p.issued} ${p.unit} | رصيد متوفر: ${p.balance}`);
}
