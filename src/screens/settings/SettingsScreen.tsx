// Settings screen. Three concerns meet here:
//  - Appearance hosts the Dark mode toggle, which flips the app between the dark
//    and light Arcade themes via useTheme().toggleDark.
//  - Preferences (dietary restrictions, default budget, work hours) persist
//    locally via preferencesStorage. Tapping a row cycles to the next option
//    and saves all three.
//  - Account hosts the Log Out action. Logout flips the auth listener,
//    which returns RootNavigator to the Login screen; no manual navigation.
// Settings is a universal screen, so only the teal accent is used here. Colours
// come from the active theme via useTheme(); section labels use the mono font.

import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
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
import { useTheme } from "@/theme/ThemeProvider";

const DIET_OPTIONS = ["None set", "Vegetarian", "No beef", "Halal"];
const BUDGET_OPTIONS = ["Under $20", "$20 - $50", "$50 - $100", "$100+"];
const HOURS_OPTIONS = ["9am - 5pm", "7am - 3pm", "Flexible"];

type PreferenceField = "diet" | "budget" | "hours";

export function SettingsScreen() {
  const { colors, isDark, toggleDark } = useTheme();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const [diet, setDiet] = useState(DIET_OPTIONS[0]);
  const [budget, setBudget] = useState(BUDGET_OPTIONS[1]);
  const [hours, setHours] = useState(HOURS_OPTIONS[0]);

  // Load the saved settings when the screen opens. The active flag stops a late
  // load from updating state after the screen has already gone away.
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

  // Moves one setting to its next option, wrapping back to the start after the
  // last one, then saves all three settings together.
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

  // Signs the user out. The auth listener notices and returns them to login.
  async function handleLogout(): Promise<void> {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  }

  const cardStyle = { backgroundColor: colors.card, borderColor: colors.cardLine };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>

        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>APPEARANCE</Text>
        <View style={[styles.card, cardStyle]}>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Dark mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ true: colors.teal, false: colors.chip }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Dark mode"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>PREFERENCES</Text>
        <View style={[styles.card, cardStyle]}>
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

        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>ACCOUNT</Text>
        {user?.email ? (
          <Text style={[styles.sub, { color: colors.ink2 }]}>Signed in as {user.email}</Text>
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

// One row in the settings list: a label on the left, the current value and a
// chevron on the right. Tapping anywhere on the row runs onPress.
function SettingRow({ label, value, onPress, isLast }: SettingRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderBottomColor: colors.cardLine }, isLast ? styles.lastRow : null]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.ink2 }]}>{value}</Text> : null}
        <Icon name="chevron-right" size={18} color={colors.ink3} />
      </View>
    </Pressable>
  );
}

// Only non-colour properties live here. Colours are applied inline from
// useTheme() so the screen follows the dark/light theme; the mono font on the
// section labels is static so it stays in the StyleSheet.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[6],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    marginBottom: T.spacing[4],
  },
  sectionLabel: {
    fontFamily: T.font.mono,
    fontSize: T.fontSize.caption,
    letterSpacing: 0.5,
    marginTop: T.spacing[4],
    marginBottom: T.spacing[2],
  },
  card: {
    borderRadius: T.radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: T.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
  },
  rowRight: { flexDirection: "row", alignItems: "center" },
  rowValue: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginRight: T.spacing[2],
  },
  sub: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginBottom: T.spacing[3],
  },
  action: { marginTop: T.spacing[2] },
});
