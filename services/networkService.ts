import NetInfo from '@react-native-community/netinfo';

/**
 * Tracks whether the device currently has internet connectivity.
 */
let onlineStatus: boolean = true; // Assume online initially

// Subscribe to network status updates on app start
NetInfo.addEventListener((state) => {
  // Force null → false
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable ?? false;

  onlineStatus = isConnected && isInternetReachable;
});

/**
 * Checks if the device currently has an internet connection (sync, cached).
 * @returns {boolean} True if online, false otherwise.
 */
export function isOnline(): boolean {
  return onlineStatus;
}

/**
 * Async check for the latest status.
 */
export async function checkIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable ?? false;
  return isConnected && isInternetReachable;
}
