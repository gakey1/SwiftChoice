import { SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import { DesignSystemDemo } from "@/screens/_DesignSystemDemo";
// Import Firebase at app boot so init runs once. If env vars are missing
// or config is malformed, the import throws here and the app fails fast
// with a clear error from src/services/firebase.ts.
import "@/services/firebase";
import { T } from "@/theme/tokens";

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.root}>
      <DesignSystemDemo />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.canvas,
  },
});
