// Deleting the account and everything with it (US33). A screen rather than a
// confirmation box, because it needs a password field and the list of what goes
// is too long for an alert.
//
// This one really does delete everything, so it says so, but it must not round
// up: what SwiftChoice cannot reach is named. A universal screen, so teal only.

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { deleteAccount } from "@/features/privacy/accountDeletion";
import { useAuth } from "@/hooks/useAuth";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type DeleteAccountScreenProps = NativeStackScreenProps<AppStackParamList, "DeleteAccount">;

// Everything that goes. Listed rather than summarised as "all your data",
// because a person deciding whether to do this needs to recognise what they are
// losing, and "all your data" is the kind of phrase that gets skimmed past.
const WHAT_GOES: readonly string[] = [
  "Your SwiftChoice account, so you can no longer sign in",
  "Your decision history, both on this phone and in your account",
  "Your Fuel and Focus pools, and your saved tasks",
  "Your food and study preferences",
  "Your XP, level and badges",
  "Your two-factor key, if you set one up",
];

// What deleting the account genuinely cannot reach. Short, and deliberately
// present: leaving it out would make the list above read as more complete than
// it is, and this is the one screen where being caught overstating would cost
// the most.
const WHAT_STAYS: readonly string[] = [
  "Searches already sent to Google or the weather service, which were never linked to your account",
  "This app itself, which stays installed and can be used to sign up again",
];

export function DeleteAccountScreen({ navigation }: DeleteAccountScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The password is required before the button does anything, so a mistap on a
  // destructive action cannot get past an empty field.
  const canDelete = password.length > 0 && !deleting;

  // Two steps, on purpose. The password proves who they are; the confirmation
  // proves they meant to. Neither substitutes for the other: someone can type
  // their password out of habit, and someone can tap Delete without reading.
  function handleDeletePressed(): void {
    setError(null);

    Alert.alert(
      "Delete your account?",
      "This deletes your account and everything in it, on this phone and in the cloud. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: () => void runDeletion() },
      ]
    );
  }

  async function runDeletion(): Promise<void> {
    setDeleting(true);

    try {
      const result = await deleteAccount(password);

      if (result.ok) {
        // Deliberately leaves the screen in its deleting state, rather than
        // clearing it in a finally. Success ends the session, the listener in
        // useAuth notices, and RootNavigator swaps the whole signed-in stack for
        // the login screen (33.2). Navigating from here would race that, and
        // turning the button back on would offer to delete an account that has
        // already gone in whatever frames are left before the swap.
        return;
      }

      // Shown on the screen rather than in an alert, so it stays visible while
      // they retype the password.
      setError(result.message);
      setPassword("");
      setDeleting(false);
    } catch {
      // deleteAccount reports failures as a value rather than throwing, so this
      // is for the unforeseen. Recovering the button matters more than the
      // wording: the alternative is a screen stuck on "Deleting..." forever.
      setError("Could not delete your account. Please try again.");
      setDeleting(false);
    }
  }

  const cardStyle = { backgroundColor: colors.card, borderColor: colors.cardLine };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      edges={["top", "left", "right"]}
    >
      <AmbientBackground />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text
          style={[styles.back, { color: colors.ink2 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          Back
        </Text>

        <Text style={[styles.title, { color: colors.ink }]}>Delete your account</Text>
        <Text style={[styles.intro, { color: colors.ink2 }]}>
          This removes your account and everything in it, on this phone and in the cloud. It
          cannot be undone, and it cannot be partly undone.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>WHAT GETS DELETED</Text>
        <View style={[styles.card, cardStyle]}>
          {WHAT_GOES.map((item) => (
            <View key={item} style={styles.listRow}>
              <Icon name="x" size={13} color={colors.ink3} />
              <Text style={[styles.listText, { color: colors.ink2 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>WHAT THIS CANNOT REACH</Text>
        <View style={[styles.card, cardStyle]}>
          {WHAT_STAYS.map((item) => (
            <View key={item} style={styles.listRow}>
              <Icon name="info" size={13} color={colors.ink3} />
              <Text style={[styles.listText, { color: colors.ink2 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>CONFIRM IT IS YOU</Text>
        <Text style={[styles.fieldHint, { color: colors.ink2 }]}>
          {user?.email
            ? `Enter the password for ${user.email}.`
            : "Enter your password to continue."}
        </Text>
        <TextInput
          value={password}
          onChangeText={(next) => {
            setPassword(next);
            setError(null);
          }}
          placeholder="Password"
          placeholderTextColor={colors.ink3}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!deleting}
          accessibilityLabel="Password"
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.cardLine, color: colors.ink },
          ]}
        />

        {error ? (
          <Text style={[styles.error, { color: colors.fuel }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.action}>
          <Button variant="reroll" onPress={handleDeletePressed} disabled={!canDelete}>
            {deleting ? "Deleting..." : "Delete my account"}
          </Button>
        </View>

        {deleting ? (
          <View style={styles.progress}>
            <ActivityIndicator color={colors.teal} />
            <Text style={[styles.progressText, { color: colors.ink2 }]}>
              Deleting your data. Please keep the app open.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// Only non-colour properties live here. Colours come from useTheme() inline so
// the screen follows the dark and light themes.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    paddingBottom: T.spacing[6],
  },
  back: { fontSize: T.fontSize.body, marginBottom: T.spacing[4] },
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.title, marginBottom: T.spacing[2] },
  intro: { fontSize: T.fontSize.body, lineHeight: 21, marginBottom: T.spacing[5] },
  sectionLabel: {
    fontFamily: T.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: T.spacing[2],
  },
  card: {
    borderWidth: 1,
    borderRadius: T.radii.card,
    paddingHorizontal: T.spacing[4],
    paddingVertical: T.spacing[1],
    marginBottom: T.spacing[5],
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: T.spacing[2],
  },
  listText: { flex: 1, fontSize: 13, lineHeight: 18 },
  fieldHint: { fontSize: 12.5, lineHeight: 18, marginBottom: T.spacing[2] },
  input: {
    borderWidth: 1,
    borderRadius: T.radii.card,
    paddingHorizontal: T.spacing[4],
    height: 48,
    fontSize: T.fontSize.body,
  },
  error: { fontSize: 13, lineHeight: 18, marginTop: T.spacing[3] },
  action: { marginTop: T.spacing[4] },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: T.spacing[4],
  },
  progressText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});
