// Placeholder login screen. US05 replaces this with the real login screen.
// Present so the auth stack is coherent and navigable today.

import { StyleSheet, Text, View } from "react-native";

import { T } from "@/theme/tokens";

export function LoginScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Log in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.canvas,
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.title,
    color: T.fg1,
  },
});
