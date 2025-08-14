import { Slot, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native'; // ⬅️ needed for rendering fallback strings
import { Provider, useSelector } from 'react-redux';
import { RootState, store } from './store';

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && !accessToken) {
      router.replace('/login');
    }
  }, [isReady, accessToken, router]);

  // ⬅️ Guard against raw strings/numbers
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text>{children}</Text>;
  }

  return <>{children}</>; // fragment prevents warning
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthGate>
        <Slot />
      </AuthGate>
    </Provider>
  );
}
