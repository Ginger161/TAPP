export async function catchNetworkError<T>(actionPromise: Promise<T>): Promise<T | { error: string }> {
  try {
    return await actionPromise;
  } catch (err: any) {
    console.error('Network or unhandled error caught:', err);
    
    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { error: 'Network error. Please check your connection and try again.' } as any;
    }

    // Next.js server actions throw TypeErrors when fetch fails due to network
    if (err instanceof TypeError || (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('network')))) {
      return { error: 'Network error. Please check your connection and try again.' } as any;
    }

    // Generic fallback for unhandled exceptions
    return { error: 'Something went wrong. Please try again.' } as any;
  }
}
