/**
 * security.js — Shared Defensive Engineering Utilities
 * =====================================================
 * Centralised security helpers for the Green Arrow HR application.
 * Apply these to all CSV / XLSX exports to prevent Formula Injection
 * (CSV Injection / Excel Injection) as required by the mandatory
 * Cybersecurity & Defensive Engineering directives.
 *
 * Reference: OWASP CSV Injection
 * https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * cleanCell — sanitize a single spreadsheet cell value.
 *
 * Strips leading characters that Excel / LibreOffice / Google Sheets
 * treat as formula starters: = + - @ TAB CR
 *
 * Rule: if the stringified value starts with one of those characters,
 * prefix it with a single-quote (') so the application treats it as
 * plain text — exactly what the OWASP guidance recommends.
 *
 * Numeric values are returned as-is (no stringification needed).
 *
 * @param {*} value - raw cell value from the database / state
 * @returns {string|number} sanitized value safe for spreadsheet export
 */
export function cleanCell(value) {
  if (value === null || value === undefined) return '';
  // Leave genuine numbers alone — they cannot carry formulas.
  if (typeof value === 'number') return value;
  const str = String(value);
  // Formula-injection trigger characters per OWASP guidance.
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * sanitizeXlsxRows — apply cleanCell to every value in an array of
 * plain-objects (the format used by XLSX.utils.json_to_sheet).
 *
 * @param {Object[]} rows - array of row objects
 * @returns {Object[]} new array with all string values sanitized
 */
export function sanitizeXlsxRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => {
    const clean = {};
    for (const [key, val] of Object.entries(row)) {
      clean[key] = cleanCell(val);
    }
    return clean;
  });
}

/**
 * sanitizeCsvRow — apply cleanCell to an array representing one CSV row.
 *
 * @param {Array} row - array of cell values
 * @returns {Array} sanitized row
 */
export function sanitizeCsvRow(row) {
  return row.map(cleanCell);
}

/**
 * sanitizeForExport — sanitize a 2D array of rows and convert to safe CSV string
 * @param {Array<Array>} rows - 2D array representing header and rows
 * @returns {string} Safe CSV string
 */
export function sanitizeForExport(rows = []) {
  if (!Array.isArray(rows)) return '';
  return rows
    .map(row => {
      const cleanRow = sanitizeCsvRow(row);
      return cleanRow
        .map(val => {
          const str = String(val === null || val === undefined ? '' : val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');
    })
    .join('\r\n');
}

