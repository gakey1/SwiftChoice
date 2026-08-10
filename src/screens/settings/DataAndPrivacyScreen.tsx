// The full account of what SwiftChoice collects, where it goes, and what stays
// on the phone. The long form of the short notices shown around the app (US34).
//
// Written to one rule: every line is checkable against the code, and nothing is
// softened. This is the screen someone opens looking for the truth.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Icon } from "@/components/Icon";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type DataAndPrivacyScreenProps = NativeStackScreenProps<
  AppStackParamList,
  "DataAndPrivacy"
>;

// Everything that leaves the device. If a line is added to the app that sends
// something, it belongs here, and the notice next to that control belongs with
// it. Four entries is the whole list today.
const LEAVES_THE_PHONE: readonly { what: string; where: string; when: string }[] = [
  {
    what: "A decision you accept",
    where: "Your SwiftChoice account",
    when: "Each time you press Accept, so your history is there when you sign in again.",
  },
  {
    what: "Your location, or an area you type",
    where: "Google",
    when: "Each Eat Out search, to find places near you. Nothing identifying you is sent with it.",
  },
  {
    what: "Your location",
    where: "A weather service",
    when: "Each Focus recommendation, to check whether you need a jacket or an umbrella. Nothing identifying you is sent with it.",
  },
  {
    what: "The names of tasks that tie",
    where: "Our own server, then Google",
    when: "Only when you rank, and only for tasks that scored exactly the same. Their names, deadlines and notes are sent so the order can be explained. Nothing identifying you goes with them and our server keeps no copy, but Google may keep what it receives and use it to improve its own products. Keep private details out of a task you intend to rank.",
  },
];

// Everything that does not. Worth listing explicitly: without it, a reader has
// no way to tell the difference between data we keep locally and data we simply
// have not mentioned.
const STAYS_ON_THE_PHONE: readonly string[] = [
  "Your food and study preferences",
  "Your Fuel and Focus pools",
  "Your decision history, alongside the copy in your account",
  "Your XP, level and badges",
  "Your theme and avatar",
  "Your two-factor key, which is why it only protects this phone",
  "Your Priority tasks, except the tied ones sent to break a draw",
];

export function DataAndPrivacyScreen({ navigation }: DataAndPrivacyScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <AmbientBackground />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text
          style={[styles.back, { color: colors.ink2 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          Back
        </Text>

        <Text style={[styles.title, { color: colors.ink }]}>Your data</Text>
        <Text style={[styles.intro, { color: colors.ink2 }]}>
          SwiftChoice keeps almost everything on this phone. Four things leave it, and each one
          is listed below with the reason.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>WHAT LEAVES THIS PHONE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
          {LEAVES_THE_PHONE.map((entry, index) => (
            <View
              key={entry.what}
              style={[
                styles.entry,
                { borderBottomColor: colors.cardLine },
                index === LEAVES_THE_PHONE.length - 1 ? styles.lastEntry : null,
              ]}
            >
              <Text style={[styles.entryWhat, { color: colors.ink }]}>{entry.what}</Text>
              <View style={styles.entryDestination}>
                <Icon name="arrow-right" size={12} color={colors.teal} />
                <Text style={[styles.entryWhere, { color: colors.teal }]}>{entry.where}</Text>
              </View>
              <Text style={[styles.entryWhen, { color: colors.ink2 }]}>{entry.when}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>WHAT STAYS ON THIS PHONE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
          {STAYS_ON_THE_PHONE.map((item) => (
            <View key={item} style={styles.stayRow}>
              <Icon name="smartphone" size={13} color={colors.ink3} />
              <Text style={[styles.stayText, { color: colors.ink2 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>WORTH KNOWING</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
          <Text style={[styles.noteText, { color: colors.ink2 }]}>
            A study spot has a name but no map position, so the weather we show is for where your
            phone is, not for the spot. On the way there that is the useful answer. For a spot some
            distance away it is approximate.
          </Text>
          <Text style={[styles.noteText, { color: colors.ink2 }]}>
            Clearing data in Settings clears what is on this phone. Decisions already copied to
            your account stay there until the account itself is deleted.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>THE FULL DOCUMENTS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
          <LegalLink
            label="Privacy policy"
            onPress={() => navigation.navigate("Legal", { document: "privacy" })}
          />
          <LegalLink
            label="Terms of use"
            onPress={() => navigation.navigate("Legal", { document: "terms" })}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// One row opening a document. Kept here rather than reusing the Settings row,
// because that one shows a value and a chevron and these have no value to show.
function LegalLink({
  label,
  onPress,
  isLast,
}: {
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={[
        styles.legalRow,
        { borderBottomColor: colors.cardLine },
        isLast ? styles.lastEntry : null,
      ]}
    >
      <Text style={[styles.legalLabel, { color: colors.ink }]}>{label}</Text>
      <Icon name="chevron-right" size={18} color={colors.ink3} />
    </Pressable>
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
    marginBottom: T.spacing[5],
  },
  entry: { paddingVertical: T.spacing[3], borderBottomWidth: 1 },
  lastEntry: { borderBottomWidth: 0 },
  entryWhat: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  entryDestination: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  entryWhere: { fontSize: 12.5 },
  entryWhen: { fontSize: 12.5, lineHeight: 17.5, marginTop: 5 },
  stayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: T.spacing[2],
  },
  stayText: { flex: 1, fontSize: 13, lineHeight: 18 },
  noteText: { fontSize: 12.5, lineHeight: 18, paddingVertical: T.spacing[3] },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: T.spacing[3],
    borderBottomWidth: 1,
  },
  legalLabel: { fontSize: T.fontSize.body },
});
