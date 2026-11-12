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

export const DEFAULT_SHARE_VALUE = 2000;

/**
 * Computes the number of shares equivalent to a monetary contribution.
 * Example: calculateShares(6000, 2000) -> 3
 */
export function calculateShares(amount: number, shareValue: number = DEFAULT_SHARE_VALUE): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return 0;
  if (typeof shareValue !== 'number' || isNaN(shareValue) || shareValue <= 0) return 0;
  return Math.round((amount / shareValue) * 100) / 100;
}

/**
 * Formats a share count cleanly (e.g. 1 -> "1 share", 3 -> "3 shares", 2.5 -> "2.5 shares").
 */
export function formatShares(shares: number): string {
  if (typeof shares !== 'number' || isNaN(shares) || shares < 0) {
    shares = 0;
  }
  const rounded = Math.round(shares * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${formatted} ${rounded === 1 ? 'share' : 'shares'}`;
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

/**
 * Generates a deterministic username and password from a member's name and phone number.
 */
export function generateMemberCredentials(
  firstName: string,
  lastName: string,
  phoneNumber?: string
): { username: string; password: string } {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const phoneDigits = (phoneNumber || '').replace(/\D/g, '');
  const phoneSuffix = phoneDigits.slice(-4) || '1015';

  const baseUsername =
    [cleanFirst, cleanLast].filter(Boolean).join('.') || 'member';
  const username = phoneDigits.length >= 4 && !cleanLast
    ? `${baseUsername}${phoneSuffix}`
    : baseUsername;

  const namePrefix = cleanFirst.slice(0, 4) || cleanLast.slice(0, 4) || 'huluga';
  const lastInitial = cleanLast.slice(0, 2);
  let password = `${namePrefix}${lastInitial}${phoneSuffix}`;
  if (password.length < 6) {
    password = `${password}huluga`.slice(0, 8);
  }

  return { username, password };
}
