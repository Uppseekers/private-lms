/**
 * Sanitizes technical database / backend errors so internal infrastructure names
 * (such as "Firestore", "Firebase", or security-rule jargon) never appear in
 * user-facing alerts, toasts, or banners.
 */
export function sanitizeUserErrorMessage(
  error: unknown,
  fallback = 'Unable to complete this action. Please talk to your Admin for assistance.'
): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();
  const isTechnicalOrPermissionError =
    lower.includes('firestore') ||
    lower.includes('firebase') ||
    lower.includes('permission-denied') ||
    lower.includes('permission_denied') ||
    lower.includes('missing or insufficient permissions') ||
    lower.includes('security rules') ||
    lower.includes('failed-precondition') ||
    lower.includes('unauthenticated') ||
    lower.includes('internal error') ||
    lower.includes('client is offline');

  if (isTechnicalOrPermissionError) {
    return fallback;
  }

  return trimmed;
}
