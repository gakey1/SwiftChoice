// Read-only decision history. Lists the decisions saved by the shared
// history API (logDecision) whenever the user accepts a recommendation. It
// reloads each time the tab gains focus, so a decision just accepted on the
// Fuel or Focus screen appears the moment the user lands here.
//
// The list can be filtered by module (Fuel / Focus / Priority) and by time
// (Today / This week). Filtering is done in memory over the already-loaded
// list: the shown list is derived with useMemo from the full list plus the two
// filters, so there is no second copy of state to keep in sync.
//
// Colours come from the active theme via useTheme(), so this screen follows the
// dark/light Arcade toggle. Only colours are theme-aware; spacing, sizes and
// font names stay in the StyleSheet. The filter chip labels use the mono font
// for the "coded" Arcade look.

import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/Card";
import { getDecisions, type DecisionRecord } from "@/features/history/historyStorage";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

const MODULE_LABEL: Record<DecisionRecord["moduleType"], string> = {
  fuel: "Fuel",
  focus: "Focus",
  priority: "Priority",
};

type ModuleFilter = "all" | DecisionRecord["moduleType"];
type TimeFilter = "all" | "today" | "week";

const MODULE_FILTERS: readonly ModuleFilter[] = ["all", "fuel", "focus", "priority"];
const MODULE_FILTER_LABEL: Record<ModuleFilter, string> = {
  all: "All",
  fuel: "Fuel",
  focus: "Focus",
  priority: "Priority",
};

const TIME_FILTERS: readonly TimeFilter[] = ["all", "today", "week"];
const TIME_FILTER_LABEL: Record<TimeFilter, string> = {
  all: "All time",
  today: "Today",
  week: "This week",
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

// True if a decision's timestamp falls inside the chosen time range. "today" is
// the current calendar day; "week" is the last seven days.
function withinRange(iso: string, range: TimeFilter): boolean {
  if (range === "all") {
    return true;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  if (range === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return date.getTime() <= now.getTime() && now.getTime() - date.getTime() <= sevenDaysMs;
}

// A row of pick-one filter chips in the universal teal/neutral style. Generic so
// the same row drives both the module filter and the time filter. Reads the
// active theme for its colours.
function FilterChipRow<TValue extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly TValue[];
  value: TValue;
  onChange: (next: TValue) => void;
  labels: Record<TValue, string>;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: colors.tealTint, borderColor: colors.teal }
                : { backgroundColor: colors.chip, borderColor: colors.cardLine },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[option]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.teal : colors.ink2 }]}>
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HistoryScreen() {
  const { colors } = useTheme();
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

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

  // Derived, not stored: the shown list is computed from the full list plus the
  // two filters, and only recomputed when one of those changes.
  const shown = useMemo(
    () =>
      decisions.filter(
        (decision) =>
          (moduleFilter === "all" || decision.moduleType === moduleFilter) &&
          withinRange(decision.decidedAt, timeFilter)
      ),
    [decisions, moduleFilter, timeFilter]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>History</Text>
        <Text style={[styles.subtitle, { color: colors.ink2 }]}>The decisions you have accepted</Text>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : error ? (
        <View style={styles.centre}>
          <Text style={[styles.muted, { color: colors.ink2 }]}>
            Could not load your history. Try again in a moment.
          </Text>
        </View>
      ) : decisions.length === 0 ? (
        <View style={styles.centre}>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>No decisions yet</Text>
          <Text style={[styles.muted, { color: colors.ink2 }]}>
            Accept a Fuel or Focus recommendation and it will show up here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.filters}>
            <FilterChipRow
              options={MODULE_FILTERS}
              value={moduleFilter}
              onChange={setModuleFilter}
              labels={MODULE_FILTER_LABEL}
            />
            <FilterChipRow
              options={TIME_FILTERS}
              value={timeFilter}
              onChange={setTimeFilter}
              labels={TIME_FILTER_LABEL}
            />
          </View>

          {shown.length === 0 ? (
            <View style={styles.centre}>
              <Text style={[styles.muted, { color: colors.ink2 }]}>
                No decisions match these filters.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {shown.map((decision) => (
                <Card
                  key={decision.historyId}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardLine }]}
                >
                  <Text style={[styles.itemName, { color: colors.ink }]}>
                    {decision.itemSnapshot.name}
                  </Text>
                  <Text style={[styles.meta, { color: colors.ink2 }]}>
                    {MODULE_LABEL[decision.moduleType]} · {formatDecidedAt(decision.decidedAt)}
                    {decision.rerolled ? " · rerolled" : ""}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// Only non-colour properties live here (layout, spacing, sizes, font names).
// Colours are applied inline from useTheme() because StyleSheet.create runs once
// at import, before a theme is known, so a colour baked in here could not switch.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    paddingBottom: T.spacing[3],
  },
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginTop: 2 },
  filters: {
    paddingHorizontal: T.spacing.pageX,
    paddingBottom: T.spacing[3],
    gap: T.spacing[2],
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: T.spacing[2] },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: T.font.mono, fontSize: T.fontSize.caption },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: T.spacing[5] },
  emptyTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle, marginBottom: T.spacing[1] },
  muted: { fontFamily: T.font.regular, fontSize: T.fontSize.body, textAlign: "center" },
  list: {
    paddingHorizontal: T.spacing.pageX,
    paddingBottom: T.spacing[6],
    gap: T.spacing[3],
  },
  row: { width: "100%" },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  meta: { fontFamily: T.font.regular, fontSize: T.fontSize.caption, marginTop: 2 },
});
