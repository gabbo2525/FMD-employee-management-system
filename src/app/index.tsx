import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    if (role === 'admin') return <Redirect href="/(admin)/employees" />;
    return <Redirect href="/(employee)/attendance" />;
  }

  return <Redirect href="/(auth)/login" />;
}
