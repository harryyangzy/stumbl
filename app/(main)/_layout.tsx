import { Stack } from 'expo-router';

import { theme } from '@/lib/theme';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.screenBg },
      }}
    />
  );
}
