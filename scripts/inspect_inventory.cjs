const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ملفات تقارير الحملات', 'حركة مخزن الى شهر 9 2026.xlsx');
console.log('Reading file:', filePath);

const workbook = XLSX.readFile(filePath);
console.log('Sheet names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('Total rows:', data.length);
  for (let i = 0; i < Math.min(10, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
}
