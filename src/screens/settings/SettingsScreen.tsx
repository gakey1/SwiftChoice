// Settings screen. Two concerns meet here:
//  - Preferences (dietary restrictions, default budget, work hours) persist
//    locally via preferencesStorage. Tapping a row cycles to the next option
//    and saves all three.
//  - Account hosts the Log Out action (US06). Logout flips the auth listener,
//    which returns RootNavigator to the Login screen; no manual navigation.
// Settings is a universal screen, so only the teal accent is used here.

import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import {
  loadPreferences,
  savePreferences,
} from "@/services/localdb/preferencesStorage";
import { T } from "@/theme/tokens";

const DIET_OPTIONS = ["None set", "Vegetarian", "No beef", "Halal"];
const BUDGET_OPTIONS = ["Under $20", "$20 - $50", "$50 - $100", "$100+"];
const HOURS_OPTIONS = ["9am - 5pm", "7am - 3pm", "Flexible"];

type PreferenceField = "diet" | "budget" | "hours";

export function SettingsScreen() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const [diet, setDiet] = useState(DIET_OPTIONS[0]);
  const [budget, setBudget] = useState(BUDGET_OPTIONS[1]);
  const [hours, setHours] = useState(HOURS_OPTIONS[0]);

  useEffect(() => {
    let active = true;
    void loadPreferences().then((stored) => {
      if (!active) return;
      setDiet(stored.dietaryRestrictions);
      setBudget(stored.defaultBudget);
      setHours(stored.workHours);
    });
    return () => {
      active = false;
    };
  }, []);

  async function cycleOption(
    current: string,
    options: string[],
    field: PreferenceField
  ): Promise<void> {
    const nextIndex = (options.indexOf(current) + 1) % options.length;
    const nextValue = options[nextIndex];
    if (!nextValue) return;

    const next = {
      dietaryRestrictions: field === "diet" ? nextValue : diet ?? "",
      defaultBudget: field === "budget" ? nextValue : budget ?? "",
      workHours: field === "hours" ? nextValue : hours ?? "",
    };

    setDiet(next.dietaryRestrictions);
    setBudget(next.defaultBudget);
    setHours(next.workHours);

    await savePreferences(next);
  }

  async function handleLogout(): Promise<void> {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <SettingRow
            label="Dietary Restrictions"
            value={diet ?? ""}
            onPress={() => cycleOption(diet ?? "", DIET_OPTIONS, "diet")}
          />
          <SettingRow
            label="Default Budget"
            value={budget ?? ""}
            onPress={() => cycleOption(budget ?? "", BUDGET_OPTIONS, "budget")}
          />
          <SettingRow
            label="Work Hours"
            value={hours ?? ""}
            onPress={() => cycleOption(hours ?? "", HOURS_OPTIONS, "hours")}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        {user?.email ? (
          <Text style={styles.sub}>Signed in as {user.email}</Text>
        ) : null}
        <View style={styles.action}>
          <Button variant="reroll" onPress={handleLogout} disabled={signingOut}>
            {signingOut ? "Logging out..." : "Log out"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingRowProps = {
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
};

function SettingRow({ label, value, onPress, isLast }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, isLast ? styles.lastRow : null]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Icon name="chevron-right" size={18} color={T.fg2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.canvas },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[6],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
    marginBottom: T.spacing[4],
  },
  sectionLabel: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginTop: T.spacing[4],
    marginBottom: T.spacing[2],
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.radii.card,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: T.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.fg1,
  },
  rowRight: { flexDirection: "row", alignItems: "center" },
  rowValue: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginRight: T.spacing[2],
  },
  sub: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginBottom: T.spacing[3],
  },
  action: { marginTop: T.spacing[2] },
});
