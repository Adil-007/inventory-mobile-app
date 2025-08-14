// hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export default function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true); // default to true

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected); // force to boolean
    });
    return () => unsubscribe();
  }, []);

  return { isConnected };
}
