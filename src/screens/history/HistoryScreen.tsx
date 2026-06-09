// Placeholder History screen. The decision history view is US26 (Yvonne's
// slice, Sprint 3). Present so the History tab has a destination today.

import { StyleSheet, Text, View } from "react-native";

import { T } from "@/theme/tokens";

export function HistoryScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>History</Text>
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
