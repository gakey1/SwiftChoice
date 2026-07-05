// Read-only decision history (US26). Lists the decisions saved by the shared
// history API (logDecision) whenever the user accepts a recommendation. It
// reloads each time the tab gains focus, so a decision just accepted on the
// Fuel or Focus screen appears the moment the user lands here.
//
// History is a universal surface, so it uses teal and neutral tones only, never
// a module colour (the amber/green/purple scoping is reserved for the module
// screens themselves).

import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/Card";
import { getDecisions, type DecisionRecord } from "@/features/history/historyStorage";
import { T } from "@/theme/tokens";

const MODULE_LABEL: Record<DecisionRecord["moduleType"], string> = {
  fuel: "Fuel",
  focus: "Focus",
  priority: "Priority",
};

// decidedAt is an ISO string. Show a short, readable day-and-time, e.g.
// "5 Jul, 2:15 pm". Falls back to an empty string if the value is ever unusable.
function formatDecidedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryScreen() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reload on every focus rather than once on mount, so the list is fresh after
  // the user accepts a new recommendation and navigates back here. The `active`
  // guard stops a late response from setting state after the screen has blurred.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(false);

      getDecisions()
        .then((rows) => {
          if (active) setDecisions(rows);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>The decisions you have accepted</Text>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={T.teal} />
        </View>
      ) : error ? (
        <View style={styles.centre}>
          <Text style={styles.muted}>Could not load your history. Try again in a moment.</Text>
        </View>
      ) : decisions.length === 0 ? (
        <View style={styles.centre}>
          <Text style={styles.emptyTitle}>No decisions yet</Text>
          <Text style={styles.muted}>
            Accept a Fuel or Focus recommendation and it will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {decisions.map((decision) => (
            <Card key={decision.historyId} style={styles.row}>
              <Text style={styles.itemName}>{decision.itemSnapshot.name}</Text>
              <Text style={styles.meta}>
                {MODULE_LABEL[decision.moduleType]} · {formatDecidedAt(decision.decidedAt)}
                {decision.rerolled ? " · rerolled" : ""}
              </Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.canvas },
  header: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    paddingBottom: T.spacing[3],
  },
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  subtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginTop: 2,
  },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: T.spacing[5] },
  emptyTitle: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.subtitle,
    color: T.fg1,
    marginBottom: T.spacing[1],
  },
  muted: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: T.spacing.pageX,
    paddingBottom: T.spacing[6],
    gap: T.spacing[3],
  },
  row: { width: "100%" },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.body, color: T.fg1 },
  meta: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    color: T.fg2,
    marginTop: 2,
  },
});
