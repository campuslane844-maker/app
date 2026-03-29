import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "react-native-gesture-handler";
import { useAuthStore } from '@/lib/store/auth';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Quicksand-Light': require('@/assets/fonts/Quicksand-Light.ttf'),
    'Quicksand-Regular': require('@/assets/fonts/Quicksand-Regular.ttf'),
    'Quicksand-Medium': require('@/assets/fonts/Quicksand-Regular.ttf'),
    'Quicksand-SemiBold': require('@/assets/fonts/Quicksand-SemiBold.ttf'),
    'Quicksand-Bold': require('@/assets/fonts/Quicksand-Bold.ttf'),
    'DM Sans': require('@/assets/fonts/DmSans-Variable.ttf'),
  });
  const {fetchMe} = useAuthStore();

   useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
    fetchMe();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME['light']}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
