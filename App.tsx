<<<<<<< HEAD
=======
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)
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

<<<<<<< HEAD
// Import Firebase at app boot so init runs once. If env vars are missing
// or config is malformed, the import throws here and the app fails fast
// with a clear error from src/services/firebase.ts.
import "@/services/firebase";
import { AuthProvider } from "@/hooks/useAuth";
import { RootNavigator } from "@/navigation/RootNavigator";
=======
import "@/services/firebase";
import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { T } from "@/theme/tokens";
import { DesignSystemDemo } from "@/screens/_DesignSystemDemo";
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)

export default function App() {
  const [activeScreen, setActiveScreen] = useState<BottomNavKey>("home");

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
<<<<<<< HEAD
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
=======
    <SafeAreaView style={styles.root}>
      <View style={styles.frame}>
        {activeScreen === "home" ? <DesignSystemDemo /> : null}
        {activeScreen === "history" ? <HistoryScreen /> : null}
        {activeScreen === "settings" ? <SettingsScreen /> : null}
      </View>

      <BottomNav active={activeScreen} onNavigate={setActiveScreen} />
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
<<<<<<< HEAD
=======



function HistoryScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Your accepted decisions will appear here.</Text>

      <View style={styles.emptyCard}>
        <Text style={styles.cardTitle}>No decisions yet</Text>
        <Text style={styles.cardText}>
          Once you accept a recommendation, SwiftChoice will record it here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  frame: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  screen: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[6],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
    marginBottom: T.spacing[2],
  },
  subtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginBottom: T.spacing[5],
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E2DC",
    padding: T.spacing[4],
    marginBottom: T.spacing[3],
  },
  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E2DC",
    padding: T.spacing[4],
  },
  cardTitle: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.title,
    color: T.fg1,
    marginBottom: T.spacing[1],
  },
  cardText: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
  },
});
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)
