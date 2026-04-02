import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { addUserInteractionListener } from 'expo-widgets';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useCommuteCountdownRefresh } from '@/hooks/useCommuteCountdownRefresh';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { theme } from '@/lib/theme';
import { loadStumblWidget } from '@/lib/stumblWidgetLoader';

import '../global.css';

export default function RootLayout() {
  useCommuteCountdownRefresh();

  useEffect(() => {
    void loadStumblWidget();
  }, []);

  useEffect(() => {
    const sub = addUserInteractionListener(() => {
      const url = widgetMapsUrlBridge.current;
      if (url) {
        void Linking.openURL(url);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.screenBg },
          animation: 'slide_from_right',
        }}
      />
    </SafeAreaProvider>
  );
}
