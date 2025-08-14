import NetInfo from '@react-native-community/netinfo';

/**
 * Checks if the device currently has an internet connection.
 * @returns {boolean} True if online, false otherwise.
 */
export function isOnline(): boolean {
  // NetInfo.fetch() returns a Promise, so to use this sync in apiClient,
  // you would need to cache the value or make this async.
  // Here's an approach using a cached value updated via event subscription.

  return onlineStatus;
}

let onlineStatus = true; // Assume online initially

// Subscribe to network status updates on app start
NetInfo.addEventListener(state => {
  onlineStatus = state.isConnected && state.isInternetReachable !== false;
});

// Optional: export a function that returns a Promise resolved with latest status (async)
export async function checkIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
}
