// Formatters for Dora Social Bot
export function formatSAR(value, compact = false, decimals = 0) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  if (compact) {
    if (Math.abs(num) >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)} مليون ر.س`;
    }
    if (Math.abs(num) >= 200_000) {
      return `${(num / 1_000).toFixed(1)} ألف ر.س`;
    }
    return `${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ر.س`;
  }
  return `${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ر.س`;
}

export function formatNum(value, decimals = 0) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
