/**
 * Formats a date string into a human-readable relative time (Indonesian locale).
 *
 * @param dateString - ISO date string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a date string into a short abbreviated relative time.
 * Used for "edited" timestamps: "diedit 1j lalu", "diedit 5mnt lalu"
 *
 * @param dateString - ISO date string
 * @returns Short formatted relative time string
 */
export function formatRelativeTimeShort(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "baru saja";
  if (diffMins < 60) return `${diffMins}mnt lalu`;
  if (diffHours < 24) return `${diffHours}j lalu`;
  if (diffDays < 7) return `${diffDays}h lalu`;
  if (diffWeeks < 5) return `${diffWeeks}m lalu`;
  if (diffMonths < 12) return `${diffMonths}bln lalu`;
  return `${diffYears}th lalu`;
}

/**
 * Formats a large number into a compact Indonesian-style string.
 * Example: 1200 -> "1,2rb", 1500000 -> "1,5jt"
 *
 * @param count - Number to format
 * @returns Formatted number string
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1_000_000)
    return `${(count / 1000).toFixed(1).replace(".", ",")}rb`;
  return `${(count / 1_000_000).toFixed(1).replace(".", ",")}jt`;
}

/**
 * Masks a phone number for privacy-safe logging (UU PDP compliance).
 * Example: +6281234567890 -> +62***7890
 *
 * @param phone - Full phone number string
 * @returns Masked phone number string
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length < 6) return "***";
  const last4 = phone.slice(-4);
  const prefix = phone.startsWith("+62") ? "+62" : phone.slice(0, 3);
  return `${prefix}***${last4}`;
}
