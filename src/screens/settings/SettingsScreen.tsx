// Settings screen. Labelled cards ordered from who you are, through how the app
// behaves, to what it holds about you, ending with the one irreversible action:
//
//   ACCOUNT           the email, two-factor, log out
//   PREFERENCES       diet, budget, work hours, saved via preferencesStorage
//   APPEARANCE        dark mode, via useTheme().toggleDark
//   DATA AND PRIVACY  what we collect, clear this phone
//   ABOUT             privacy policy, terms of use
//   DANGER ZONE       delete the account
//
// A universal screen, so teal only, the one exception being the delete label.

import { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { GameIcon } from "@/components/GameIcon";
import { Icon } from "@/components/Icon";
import { levelTitle } from "@/features/progress/progress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { HUD_CLEARANCE } from "@/components/XpHud";
import { AVATARS } from "@/features/profile/avatars";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { clearLocalData } from "@/features/privacy/localData";
import { isBudgetTier, saveBudgetTier } from "@/services/firestore/users";
import {
  loadPreferences,
  savePreferences,
} from "@/services/localdb/preferencesStorage";
import { loadAvatarIndex, saveAvatarIndex } from "@/services/localdb/profileStorage";
import { isTotpEnrolled } from "@/services/localdb/totpStorage";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

const DIET_OPTIONS = ["None set", "Vegetarian", "No beef", "Halal"];
const BUDGET_OPTIONS = ['None set','budget', 'moderate', 'premium'];

const BUDGET_LABELS: Record<string, string> = {
  'None set': 'None set',
  budget: '$10',
  moderate: '$25',
  premium: '$45',
};

const HOURS_OPTIONS = ["9am - 5pm", "7am - 3pm", "Flexible"];

type PreferenceField = "diet" | "budget" | "hours";

export function SettingsScreen() {
  const { colors, isDark, toggleDark } = useTheme();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [twoFactorOn, setTwoFactorOn] = useState(false);

  // Settings sits in the tabs, while the 2FA screen sits on the stack above
  // them, so the parent navigator is what routes there.
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Re-read on every focus rather than once on mount, so coming back from the
  // setup screen shows the new state instead of a stale value.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const enrolled = await isTotpEnrolled();
        if (active) setTwoFactorOn(enrolled);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const [diet, setDiet] = useState(DIET_OPTIONS[0]);
  const [budget, setBudget] = useState(BUDGET_OPTIONS[0]);
  const [hours, setHours] = useState(HOURS_OPTIONS[0]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const { progress } = useProgress();
  // Falls back to the first avatar if a stored index ever points past the end
  // of the list, which would otherwise crash the screen on a bad read.
  const currentAvatar = AVATARS[avatarIndex] ?? AVATARS[0];

  // Load the saved settings when the screen opens. The active flag stops a late
  // load from updating state after the screen has already gone away.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      void loadPreferences().then((stored) => {
        if (!active) return;
        setDiet(stored.dietaryRestrictions);
        setBudget(stored.defaultBudget);
        setHours(stored.workHours);
      });

      void loadAvatarIndex().then((i) => {
        if (active) setAvatarIndex(i);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  // Selects and persists a profile avatar. The choice shows on the Home player
  // card and here.
  async function selectAvatar(index: number): Promise<void> {
    setAvatarIndex(index);
    await saveAvatarIndex(index);
  }

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
      defaultBudget: budget ?? "moderate",
      workHours: field === "hours" ? nextValue : hours ?? "",
    };

    setDiet(next.dietaryRestrictions);
    setHours(next.workHours);

    await savePreferences(next);
  }

  // Instant 1-tap picker for budget to avoid multi-clicking
  function handleOpenBudgetPicker() {
    Alert.alert(
      "Select Budget",
      "What is your typical meal budget?",
      [
        { text: " $10 ", onPress: () => updateBudgetPreference('budget') },
        { text: " $25 ", onPress: () => updateBudgetPreference('moderate') },
        { text: " $45 ", onPress: () => updateBudgetPreference('premium') },
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
  }

  async function updateBudgetPreference(selectedTier: string) {
    // Show the new choice straight away.
    setBudget(selectedTier);

    // Save it alongside the other settings on this device.
    const next = {
      dietaryRestrictions: diet ?? "",
      defaultBudget: selectedTier,
      workHours: hours ?? "",
    };
    await savePreferences(next);

    // Keep the profile in step, since that is the copy the survey checks and
    // the one that follows the user to another device. Changing the budget here
    // would otherwise leave the profile holding the original survey answer.
    if (user && isBudgetTier(selectedTier)) {
      try {
        await saveBudgetTier(user.uid, selectedTier);
      } catch (error) {
        console.warn("Could not save the budget level to the profile", error);
      }
    }
  }

  // Clears what this app has stored on the phone. Deliberately worded to
  // say "on this phone", because accepted decisions are also mirrored to the
  // cloud and that copy survives this. Claiming more than we delete is the one
  // thing a privacy action must not do. Deleting the account goes further.
  async function handleClearLocalData(): Promise<void> {
    Alert.alert(
      "Clear Local Data?",
      "This removes your preferences, saved spots, meals, on-device history, progress and avatar from this phone. Your account stays, and history already saved to your account is not affected. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              const result = await clearLocalData();

              if (result.ok) {
                // Reset what is on screen so it matches what is now stored.
                setDiet(DIET_OPTIONS[0]);
                setBudget(BUDGET_OPTIONS[0]);
                setHours(HOURS_OPTIONS[0]);
                setAvatarIndex(0);
                Alert.alert("Cleared", "The data this app stored on this phone has been removed.");
              } else {
                // Say what did not go, rather than reporting success.
                Alert.alert(
                  "Partly cleared",
                  `Most of it was removed, but this was not: ${result.failed.join(", ")}. Try again, or restart the app and try once more.`
                );
              }
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
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
      <AmbientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>

        {/* The profile summary the design puts between the heading and the
            avatar picker. It shows who you are before offering to change how
            you look, which is why it sits above the picker rather than below.

            The design's second line reads "N-day streak". We do not track days,
            so this shows the count we actually hold instead of dressing it up
            as something we measure. */}
        {/* The design gives this card the priority purple border and tint, which
            is a deliberate exception to the module-colour scoping rule since
            Settings is a universal screen. Kept because it is what sets the card
            apart from the eight plain ones below it. Logged as a divergence. */}
        <View
          style={[
            styles.card,
            styles.profileCard,
            { backgroundColor: colors.priorityTint, borderColor: colors.priority },
          ]}
          testID="settings-profile"
        >
          {currentAvatar ? (
            <Image
              source={currentAvatar.source}
              style={[
                styles.profileAvatar,
                { borderColor: colors.cardLine, shadowColor: currentAvatar.color },
              ]}
            />
          ) : null}
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: colors.ink }]} numberOfLines={1}>
              {levelTitle(progress.level)}, Lv {progress.level}
            </Text>
            <View style={styles.profileMetaRow}>
              <GameIcon glyph="fire" size={13} color={colors.fuel} />
              <Text style={[styles.profileMeta, { color: colors.teal }]}>
                {progress.completedCount}{" "}
                {progress.completedCount === 1 ? "task done" : "tasks done"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>PROFILE AVATAR</Text>
        <View style={[styles.card, styles.avatarCard, cardStyle]}>
          <View style={styles.avatarRow}>
            {AVATARS.map((a, i) => {
              const selected = i === avatarIndex;
              return (
                <Pressable
                  key={a.name}
                  onPress={() => selectAvatar(i)}
                  style={[
                    styles.avatarBtn,
                    { borderColor: selected ? colors.teal : colors.cardLine },
                    // The design glows the chosen robot in its own colour, which
                    // is what makes the selection obvious at a glance.
                    selected ? [styles.avatarBtnSelected, { shadowColor: a.color }] : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Avatar ${a.name}`}
                >
                  <Image source={a.source} style={styles.avatarImg} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* How it looks. Its own group rather than sitting with preferences,
            because it changes nothing about the recommendations. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>APPEARANCE</Text>
        <View style={[styles.card, cardStyle]}>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={[styles.rowLabel, styles.rowLabelFlex, { color: colors.ink }]}>Dark mode</Text>
            <Pressable
              onPress={toggleDark}
              style={[styles.switchTrack, { backgroundColor: isDark ? colors.teal : colors.track }]}
              accessibilityRole="switch"
              accessibilityState={{ checked: isDark }}
              accessibilityLabel="Dark mode"
            >
              <View style={[styles.switchKnob, { left: isDark ? 23 : 3 }]} />
            </Pressable>
          </View>
        </View>

        {/* How the app behaves for you. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>PREFERENCES</Text>
        <View style={[styles.card, cardStyle]}>
          <SettingRow
            label="Dietary Restrictions"
            value={diet ?? ""}
            onPress={() => cycleOption(diet ?? "", DIET_OPTIONS, "diet")}
          />
          <SettingRow
            label="Budget"
            value={BUDGET_LABELS[budget ?? "budget"] ?? "Not set"}
            onPress={handleOpenBudgetPicker}
          />
          <SettingRow
            label="Work Hours"
            value={hours ?? ""}
            onPress={() => cycleOption(hours ?? "", HOURS_OPTIONS, "hours")}
            isLast
          />
        </View>

        {/* Who you are, and the things that act on the account itself. The email
            sits at the top as a fact rather than a control, so the two actions
            below it are unambiguously about that account. Log out lives here
            rather than floating on its own, because it is an account action, not
            a preference. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>ACCOUNT</Text>
        <View style={[styles.card, cardStyle]}>
          <SettingRow label="Email" value={user?.email ?? "Not signed in"} accessory="none" />
          <SettingRow
            label="Change password"
            value=""
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <SettingRow
            label="Two-factor authentication"
            value={twoFactorOn ? "On for this phone" : "Off"}
            onPress={() => navigation.navigate("TwoFactorSetup")}
          />
          <SettingRow
            label="Log out"
            value={signingOut ? "Logging out..." : ""}
            onPress={handleLogout}
            disabled={signingOut}
            accessory="none"
            isLast
          />
        </View>

        {/* What is held about you, and the one control that removes some of it.
            Reading what is collected and clearing it belong together: somebody
            who has just read the list is exactly the person who wants the
            control. The caption sits under the card it describes, which is the
            fix for it previously sitting under the row above the button. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>DATA AND PRIVACY</Text>
        <View style={[styles.card, cardStyle]}>
          <SettingRow
            label="What we collect"
            value=""
            onPress={() => navigation.navigate("DataAndPrivacy")}
          />
          <SettingRow
            label="Clear Local Data"
            value={clearing ? "Clearing..." : ""}
            onPress={handleClearLocalData}
            disabled={clearing}
            accessory="none"
            isLast
          />
        </View>
        {/* No caption under this row on purpose. Tapping it opens a confirmation
            that says the same thing before anything happens, so a paragraph here
            is the warning read twice, and the one that cannot be acted on. */}

        {/* The documents. They are also reachable from inside Data and privacy,
            and are repeated here because this is where people look for them. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>ABOUT</Text>
        <View style={[styles.card, cardStyle]}>
          <SettingRow
            label="Privacy policy"
            value=""
            onPress={() => navigation.navigate("Legal", { document: "privacy" })}
          />
          <SettingRow
            label="Terms of use"
            value=""
            onPress={() => navigation.navigate("Legal", { document: "terms" })}
            isLast
          />
        </View>

        {/* Last, and on its own. Deleting the account and clearing this phone
            are one tap apart in meaning and worlds apart in consequence, so they
            are deliberately not in the same group. It routes to its own screen
            rather than opening a confirmation here: it needs a password, and the
            list of what goes is too long to read inside an alert. */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>DANGER ZONE</Text>
        <View style={[styles.card, cardStyle]}>
          <SettingRow
            label="Delete Account"
            value=""
            onPress={() => navigation.navigate("DeleteAccount")}
            tone="danger"
            isLast
          />
        </View>
        {/* Likewise no caption. This row opens a whole screen whose job is to
            spell out what goes and to ask for a password first, so a summary
            here is the same warning in a place it cannot be acted on. */}
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingRowProps = {
  label: string;
  value: string;
  // Left out for rows that only state a fact, such as the signed-in email. Those
  // render as plain text rather than a button, so a screen reader does not offer
  // to activate something that does nothing.
  onPress?: () => void;
  isLast?: boolean;
  // A chevron promises another screen. Rows that act in place (Log out, Clear
  // data) set this to "none", because a chevron on them would be a lie about
  // what the tap does.
  accessory?: "chevron" | "none";
  // Only for Delete my account. The label alone carries it; the row is not
  // filled red, which would shout on a screen people visit for ordinary reasons.
  tone?: "default" | "danger";
  disabled?: boolean;
};

// One row in the settings list: a label on the left, the current value on the
// right, and a chevron when tapping it opens another screen.
function SettingRow({
  label,
  value,
  onPress,
  isLast,
  accessory = "chevron",
  tone = "default",
  disabled,
}: SettingRowProps) {
  const { colors } = useTheme();
  const rowStyle = [
    styles.row,
    { borderBottomColor: colors.cardLine },
    isLast ? styles.lastRow : null,
  ];
  const labelColor = tone === "danger" ? colors.fuel : colors.ink;

  const content = (
    <>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.ink2 }]}>{value}</Text> : null}
        {accessory === "chevron" ? (
          <Icon name="chevron-right" size={18} color={colors.ink3} />
        ) : null}
      </View>
    </>
  );

  // A row with nothing to do is not a button. Rendering it as one would have a
  // screen reader announce the email as activatable.
  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled ?? false}
      style={[...rowStyle, disabled ? styles.rowDisabled : null]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {content}
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
    // Clear the floating XP HUD at the top-right.
    paddingTop: HUD_CLEARANCE,
    paddingBottom: T.spacing[6],
  },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    marginBottom: T.spacing[4],
  },
  sectionLabel: {
    fontFamily: T.font.monoMedium,
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[4],
    padding: T.spacing[4],
    marginBottom: T.spacing[5],
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 2,
    // The design's "0 0 18px" avatar glow. shadowColor is set inline from the
    // chosen robot. Android ignores shadowColor on views and uses elevation, so
    // the glow reads as a neutral lift there rather than a coloured one.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 9,
    elevation: 6,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[1],
    marginTop: 3,
  },
  profileMeta: { fontFamily: T.font.semibold, fontSize: T.fontSize.caption },
  avatarCard: { padding: T.spacing[4] },
  avatarRow: { flexDirection: "row", justifyContent: "space-between" },
  avatarBtn: {
    width: 60,
    height: 60,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarBtnSelected: {
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 9,
    elevation: 6,
  },
  avatarImg: { width: "100%", height: "100%" },
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
  rowLabelFlex: { flex: 1 },
  // Custom pill toggle, matching the Arcade mockup. The knob is vertically
  // centred (track 28 tall, knob 22, so top 3), and slides left/right on tap.
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: T.radii.pill,
    justifyContent: "center",
  },
  switchKnob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: T.radii.pill,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  rowRight: { flexDirection: "row", alignItems: "center" },
  rowValue: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginRight: T.spacing[2],
  },
  rowDisabled: { opacity: 0.5 },
  // Footer text under a group, describing the card above it rather than the
  // section below. Smaller than a row label so it reads as explanation.
});
