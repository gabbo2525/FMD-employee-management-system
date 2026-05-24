import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/use-auth';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inEmployeeGroup = segments[0] === '(employee)';

    // Use setTimeout to ensure navigation state is mounted before routing
    setTimeout(() => {
      if (!isAuthenticated && !inAuthGroup) {
        // Not logged in – send to login
        router.replace('/(auth)/login');
      } else if (isAuthenticated && inAuthGroup) {
        // Logged in but on login screen – redirect by role
        if (role === 'admin') {
          router.replace('/(admin)/employees');
        } else {
          router.replace('/(employee)/attendance');
        }
      } else if (isAuthenticated && role === 'employee' && inAdminGroup) {
        // Employee trying to access admin area
        router.replace('/(employee)/attendance');
      } else if (isAuthenticated && role === 'admin' && inEmployeeGroup) {
        // Admin trying to access employee area
        router.replace('/(admin)/employees');
      }
    }, 1);
  }, [isAuthenticated, isLoading, role, segments]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1D6AE5" />
      </View>
    );
  }

  return <>{children}</>;
}

import { AuthProvider } from '@/hooks/use-auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(employee)" />
        </Stack>
      </AuthGuard>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
