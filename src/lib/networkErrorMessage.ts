/** User-facing copy when requests fail due to connectivity (web + Electron). */
export const NO_INTERNET_USER_MESSAGE =
  'No internet connection. Connect to the internet and refresh the page, then try again.';

export function isChunkLoadErrorMessage(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading CSS chunk/i.test(message)
  );
}

export function isLikelyOfflineOrNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet') ||
    msg.includes('err_network') ||
    msg.includes('internet disconnected') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed') ||
    (msg.includes('timeout') && (msg.includes('network') || msg.includes('fetch')))
  );
}

/** `TypeError: Cannot read properties of undefined (reading 'length')` often appears when lists never loaded offline. */
export function isUndefinedLengthTypeError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const m = error.message || '';
  return (
    (/cannot read propert/i.test(m) && /length/i.test(m)) ||
    ((m.includes("reading 'length'") || m.includes('reading "length"')) && m.includes('undefined'))
  );
}

export function userFacingAuthOrNetworkMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return NO_INTERNET_USER_MESSAGE;
  if (isLikelyOfflineOrNetworkFailure(error)) return NO_INTERNET_USER_MESSAGE;
  if (isUndefinedLengthTypeError(error)) return NO_INTERNET_USER_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export type ErrorBoundaryCopy = {
  title: string;
  detail: string;
  showTechnical: boolean;
};

export function getErrorBoundaryCopy(error: unknown, message?: string): ErrorBoundaryCopy {
  const msg = message ?? (error instanceof Error ? error.message : String(error ?? ''));

  if (isChunkLoadErrorMessage(msg)) {
    return {
      title: 'Update available',
      detail: "We've updated the app. Please refresh to load the latest version.",
      showTechnical: false,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      title: 'No internet connection',
      detail: NO_INTERNET_USER_MESSAGE,
      showTechnical: false,
    };
  }

  if (isLikelyOfflineOrNetworkFailure(error) || isLikelyOfflineOrNetworkFailure(msg)) {
    return {
      title: 'Connection problem',
      detail: NO_INTERNET_USER_MESSAGE,
      showTechnical: false,
    };
  }

  if (isUndefinedLengthTypeError(error)) {
    return {
      title: 'No internet connection or incomplete data',
      detail: NO_INTERNET_USER_MESSAGE,
      showTechnical: false,
    };
  }

  return {
    title: 'Something went wrong',
    detail:
      'The page ran into an error. Try refreshing. If it continues, contact support with the details below.',
    showTechnical: true,
  };
}
