// Placeholder Settings screen. The full Settings UI is part of Tracy's app
// shell; this hosts only the Log Out action (US06), which is the auth slice's
// piece. The route name "Settings" is fixed so the real screen replaces this
// without changing the navigator, and Tracy's Settings calls the same
// logout() service.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { T } from "@/theme/tokens";

export function SettingsScreen() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      // No manual navigation; the auth listener flips the session to null and
      // RootNavigator returns to the Login screen.
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        {user?.email ? <Text style={styles.sub}>Signed in as {user.email}</Text> : null}
        <View style={styles.action}>
          <Button variant="reroll" onPress={handleLogout} disabled={signingOut}>
            {signingOut ? "Logging out..." : "Log out"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.canvas },
  content: {
    flex: 1,
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    gap: T.spacing[3],
  },
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  sub: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  action: { marginTop: T.spacing[5] },
});
