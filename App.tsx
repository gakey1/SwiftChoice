// Root component for SwiftChoice. This is the single entry point that
// index.ts registers as the app. Its whole job is to run the one-time boot
// steps (Firebase init, font loading) and then set up the provider stack the
// rest of the app renders inside. No screen logic lives here; that starts at
// RootNavigator.

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
import { DMMono_400Regular, DMMono_500Medium } from "@expo-google-fonts/dm-mono";

// Import Firebase at app boot so init runs once. If env vars are missing
// or config is malformed, the import throws here and the app fails fast
// with a clear error from src/services/firebase.ts.
import "@/services/firebase";
// AuthProvider holds the single onAuthStateChanged listener, the one source
// of truth for who is signed in.
import { AuthProvider } from "@/hooks/useAuth";
// RootNavigator reads that auth session and renders either the auth screens
// (signed out) or the app tabs (signed in).
import { RootNavigator } from "@/navigation/RootNavigator";
// A ref to the navigation container so code outside the React tree (services,
// helpers) can trigger navigation if needed.
import { globalNavigationRef } from "@/navigation/navigationRef";
// ThemeProvider holds the active colour theme (dark or light Arcade) and hands it
// to every screen via useTheme. It wraps the app so any screen can read the theme.
import { ThemeProvider } from "@/theme/ThemeProvider";
// ProgressProvider holds the shared XP / level progress, so Home, Priority and
// the global XP HUD all read one in-sync source.
import { ProgressProvider } from "@/features/progress/ProgressProvider";

export default function App() {
  // Load the four DM Sans weights the design system uses. useFonts returns
  // false until the font files are ready.
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    // DM Mono powers the coded Arcade elements (stats, labels, section headers).
    DMMono_400Regular,
    DMMono_500Medium,
  });

  // Render nothing until the font is loaded. This gates the whole app on the
  // font so text never flashes in the system font and then re-renders in
  // DM Sans.
  if (!fontsLoaded) return null;

  // Provider order matters and is deliberate, outermost first:
  //  - SafeAreaProvider exposes the notch and home-indicator insets to every
  //    screen below it.
  //  - AuthProvider mounts the auth listener so the session is known before
  //    the navigator decides which screens to show.
  //  - NavigationContainer is the one and only navigation root; there must be
  //    exactly one in the app. The ref lets non-React code navigate.
  //  - RootNavigator is the auth-gated switch between the signed-out and
  //    signed-in halves of the app.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <NavigationContainer ref={globalNavigationRef}>
              <RootNavigator />
            </NavigationContainer>
          </ProgressProvider>
        </AuthProvider>
        {/* Controls the OS status bar tint; "auto" picks light or dark to suit
            the screen behind it. Sits outside the navigator so it applies app-wide. */}
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
