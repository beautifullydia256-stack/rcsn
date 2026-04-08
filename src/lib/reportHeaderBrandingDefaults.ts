/**
 * Fallbacks when `schools` row omits header fields — must match latest migration defaults.
 * School name defaults to black; subtitle / address / contact / motto / divider / chip match
 * the Primary “Lower Section” (Template 3) on-screen template. Schools override via Branding.
 */
export const REPORT_HEADER_DEFAULTS = {
  schoolName: '#000000',
  subtitle: '#3b82f6',
  address: '#1e40af',
  contact: '#1e40af',
  motto: '#2563eb',
  divider: '#1e3a8a',
  chipText: '#1e3a8a',
  chipBackground: '#eff6ff',
  chipBorder: '#bfdbfe',
  metaLine: '#64748b',
  contactSeparator: '#64748b',
} as const;

/** Full legacy blue including name — only for detecting old factory rows if needed */
export const REPORT_HEADER_LEGACY_BLUESET = {
  schoolName: '#1e3a8a',
  subtitle: '#3b82f6',
  address: '#1e40af',
  contact: '#1e40af',
  motto: '#2563eb',
  divider: '#1e3a8a',
} as const;
