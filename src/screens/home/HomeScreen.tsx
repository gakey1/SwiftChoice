// Placeholder Home. US02 (Tracy) replaces this with the real Home screen.
// Kept minimal on purpose; the "Home" route name stays fixed so US04 auth
// routing does not change when US02 lands. The signed-in email is shown
// only to confirm the register-to-Home flow end to end.

import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { T } from "@/theme/tokens";

export function HomeScreen() {
  const { user } = useAuth();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Home</Text>
      {user?.email ? <Text style={styles.sub}>Signed in as {user.email}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.canvas,
    gap: T.spacing[2],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
  },
  sub: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
  },
});
