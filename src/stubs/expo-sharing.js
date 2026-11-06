// Web stub untuk expo-sharing
// Paket ini native-only - di web gunakan Web Share API (navigator.share)

export function useIncomingShare() {
  return { data: null, isLoading: false };
}

export async function isAvailableAsync() {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

export async function shareAsync(url, options = {}) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        url,
        title: options.dialogTitle || 'Bagikan',
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[expo-sharing] Share gagal:', err);
      }
    }
  } else {
    // Fallback: copy ke clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      console.info('[expo-sharing] URL disalin ke clipboard:', url);
    }
  }
}

export default {
  useIncomingShare,
  isAvailableAsync,
  shareAsync,
};
