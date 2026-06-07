// Placeholder Home. US02 (Tracy) replaces this with the real Home screen.
// Kept minimal on purpose; the "Home" route name stays fixed so US04 auth
// routing does not change when US02 lands. The signed-in email confirms the
// session, and the temporary Settings link reaches the logout action (US06)
// until Tracy's US01 bottom nav provides the real navigation.

import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, "Home">;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Home</Text>
      {user?.email ? <Text style={styles.sub}>Signed in as {user.email}</Text> : null}
      <Text
        style={styles.link}
        accessibilityRole="button"
        onPress={() => navigation.navigate("Settings")}
      >
        Settings
      </Text>
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
  link: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.body,
    color: T.teal,
    marginTop: T.spacing[4],
  },
});
