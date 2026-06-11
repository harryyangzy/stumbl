import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { addUserInteractionListener } from 'expo-widgets';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useCommuteCountdownRefresh } from '@/hooks/useCommuteCountdownRefresh';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { theme } from '@/lib/theme';
import { loadStumblWidget } from '@/lib/stumblWidgetLoader';

import '../global.css';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useCommuteCountdownRefresh();

  const [fontsLoaded, fontError] = useFonts({
    'Monotalic-Medium': require('../assets/fonts/Monotalic-Medium.ttf'),
    'Monotalic-Narrow': require('../assets/fonts/Monotalic-Narrow.ttf'),
    'Monotalic-NarrowMedium': require('../assets/fonts/Monotalic-NarrowMedium.ttf'),
    'Parabolica-Regular': require('../assets/fonts/fonnts.com-Parabolica_Regular.otf'),
    'Parabolica-Medium': require('../assets/fonts/fonnts.com-Parabolica_Medium.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  useEffect(() => {
    void loadStumblWidget();
  }, []);

  useEffect(() => {
    const sub = addUserInteractionListener(() => {
      const url = widgetMapsUrlBridge.current;
      if (url) void Linking.openURL(url);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
