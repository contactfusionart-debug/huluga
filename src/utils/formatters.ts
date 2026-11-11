const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a numeric currency amount with the specified symbol (defaults to Philippine Peso ₱).
 * Example: formatCurrency(12500) -> "₱12,500.00"
 */
export function formatCurrency(amount: number, currency = '₱'): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${currency}${formatted}`;
}

/**
 * Formats an ISO or YYYY-MM-DD date string to human-readable "MMM D, YYYY" format.
 * Avoids UTC timezone shifts on plain date strings.
 * Example: formatDate("2026-11-11") -> "Nov 11, 2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const monthName = MONTHS[monthIndex] ?? '';
    return `${monthName} ${day}, ${year}`;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a percentage rate (e.g. 5.0 -> "5.0%").
 */
export function formatPercent(rate: number): string {
  if (typeof rate !== 'number' || isNaN(rate)) {
    return '0.0%';
  }
  return `${rate.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Returns a local YYYY-MM-DD string representation of a Date object.
 */
export function toISODateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
