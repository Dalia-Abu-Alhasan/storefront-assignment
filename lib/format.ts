/**
 * The only place dates and money are turned into strings.
 *
 * Both are implemented by hand rather than through `Intl`, because the house
 * format is fixed: it must not shift with the server's locale or timezone.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `2026-09-15` renders as `15 Sep 2026`.
 * Two-digit day, three-letter month, four-digit year. No ordinals, no slashes.
 */
export function formatDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate);
  if (!match) throw new Error(`formatDate expects an ISO date (YYYY-MM-DD), received "${isoDate}"`);

  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`formatDate received an out-of-range month in "${isoDate}"`);
  }

  return `${day} ${MONTHS[monthIndex]} ${year}`;
}

/**
 * `12.5` renders as `12.50 EUR`.
 * Exactly two decimals, one space, ISO code. Never a currency symbol.
 */
export function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`formatMoney expects a finite number, received "${amount}"`);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`formatMoney expects a three-letter ISO code, received "${currency}"`);
  }

  const rounded = Math.round(amount * 100) / 100;
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);

  const units = Math.floor(absolute);
  const cents = Math.round((absolute - units) * 100);

  return `${negative ? "-" : ""}${units}.${String(cents).padStart(2, "0")} ${currency}`;
}
