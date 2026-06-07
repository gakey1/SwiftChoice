import React, { useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

//import { DesignSystemDemo } from "@/screens/_DesignSystemDemo";
import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
// Import Firebase at app boot so init runs once. If env vars are missing
// or config is malformed, the import throws here and the app fails fast
// with a clear error from src/services/firebase.ts.
import "@/services/firebase";
import { T } from "@/theme/tokens";

function HistoryScreen() { return <View style={styles.center} />; }
function SettingsScreen() { return <View style={styles.center} />; }

export default function App() {
  const [currentTab, setCurrentTab] = useState<BottomNavKey>("home");
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) return null;

  const renderScreenContent = () => {
    switch (currentTab) {
      case "home":
        return <HomeScreen />;
      case "history":
        return <HistoryScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        {renderScreenContent()}
      </View>
      <BottomNav active={currentTab} onNavigate={setCurrentTab} />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    backgroundColor: T.canvas,
    justifyContent: "center",
    alignItems: "center",
  },
});
