<<<<<<< HEAD
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
=======
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";


import {
  loadPreferences,
  savePreferences,
} from "@/services/localdb/preferencesStorage";
import { T } from "@/theme/tokens";

const DIET_OPTIONS: string[] = ["None set", "Vegetarian", "No beef", "Halal"];
const BUDGET_OPTIONS: string[] = [
  "Under $20",
  "$20 - $50",
  "$50 - $100",
  "$100+",
];
const HOURS_OPTIONS: string[] = ["9am - 5pm", "7am - 3pm", "Flexible"];

type PreferenceField = "diet" | "budget" | "hours";

type SettingRowProps = {
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
  danger?: boolean;
};

export function SettingsScreen() {
  const [diet, setDiet] = useState<string>("None set");
  const [budget, setBudget] = useState<string>("$20 - $50");
  const [hours, setHours] = useState<string>("9am - 5pm");

  useEffect(() => {
    const loadSavedPreferences = async (): Promise<void> => {
      const storedPreferences = await loadPreferences();

      setDiet(storedPreferences.dietaryRestrictions);
      setBudget(storedPreferences.defaultBudget);
      setHours(storedPreferences.workHours);
    };

    loadSavedPreferences();
  }, []);

  const cycleOption = async (
    currentValue: string,
    options: string[],
    field: PreferenceField
  ): Promise<void> => {
    const currentIndex = options.indexOf(currentValue);
    const nextValue =
      options[(currentIndex + 1) % options.length] ?? options[0];

    if (!nextValue) return;

    let nextDiet = diet;
    let nextBudget = budget;
    let nextHours = hours;

    if (field === "diet") {
      nextDiet = nextValue;
      setDiet(nextValue);
    }

    if (field === "budget") {
      nextBudget = nextValue;
      setBudget(nextValue);
    }

    if (field === "hours") {
      nextHours = nextValue;
      setHours(nextValue);
    }

    await savePreferences({
      dietaryRestrictions: nextDiet,
      defaultBudget: nextBudget,
      workHours: nextHours,
    });
  };

  return (
    <View style={styles.frame}>
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
            value={diet}
            onPress={() => cycleOption(diet, DIET_OPTIONS, "diet")}
          />
          <SettingRow
            label="Default Budget"
            value={budget}
            onPress={() => cycleOption(budget, BUDGET_OPTIONS, "budget")}
          />
          <SettingRow
            label="Work Hours"
            value={hours}
            onPress={() => cycleOption(hours, HOURS_OPTIONS, "hours")}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingRow label="Email" value="user@email.com" onPress={() => {}} />
          <SettingRow label="Change Password" value="" onPress={() => {}} />
          <SettingRow label="Log Out" value="" onPress={() => {}} isLast />
        </View>

        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <SettingRow label="Clear Local Data" value="" onPress={() => {}} />
          <SettingRow label="Export My Data" value="" onPress={() => {}} />
          <SettingRow
            label="Delete Account"
            value=""
            onPress={() => {}}
            danger
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <SettingRow label="Version" value="1.0.0" onPress={() => {}} />
          <SettingRow label="Privacy Policy" value="" onPress={() => {}} />
          <SettingRow label="Terms of Service" value="" onPress={() => {}} isLast />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      
    </View>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  isLast,
  danger,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, isLast ? styles.lastRow : null]}
    >
      <Text style={[styles.rowLabel, danger ? styles.dangerText : null]}>
        {label}
      </Text>

      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  frame: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[5],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
    marginBottom: T.spacing[4],
  },
  sectionLabel: {
    fontFamily: T.font.bold,
    fontSize: 12,
    color: T.fg2,
    marginTop: T.spacing[4],
    marginBottom: T.spacing[2],
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E2DC",
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: T.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E2DC",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.fg1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValue: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginRight: 8,
  },
  chevron: {
    fontSize: 18,
    color: T.fg2,
  },
  dangerText: {
    color: "#E45A5A",
  },
});
>>>>>>> f9ee091 (Implement preferences persistence and secure storage wrapper)
