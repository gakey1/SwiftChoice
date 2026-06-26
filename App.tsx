import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

// Import Firebase at app boot so init runs once. If env vars are missing
// or config is malformed, the import throws here and the app fails fast
// with a clear error from src/services/firebase.ts.
import "@/services/firebase";
import { AuthProvider } from "@/hooks/useAuth";
import { RootNavigator } from "@/navigation/RootNavigator";
import { globalNavigationRef } from '@/navigation/navigationRef';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={globalNavigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
