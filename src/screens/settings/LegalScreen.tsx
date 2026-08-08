// The privacy policy and the terms of use, reached from the Data and privacy
// screen. US34 asks for working links to both.
//
// They are held in the app rather than linked out to a website, because there is
// no website. A link to a page that does not exist is worse than no link: it
// looks like the document exists and has been checked.
//
// The rule every line below is written to: say only what is true of the code as
// it stands. That rules out a great deal of what a normal policy contains, and
// the omissions are deliberate rather than oversights.
//
//  - No claim of compliance with the Privacy Act, the GDPR or anything else.
//    Nobody has assessed the app against any of them, and saying otherwise
//    would be the one outright falsehood available here.
//  - No retention periods, because nothing enforces one.
//  - No promises about encryption or security beyond what Firebase does by
//    default, because we have added nothing on top of it.
//  - No company, no address, no ABN. There is no entity behind this.
//  - Nothing in the future tense. A student project cannot promise what it will
//    do after the unit ends, so it says what it does now and stops.

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type LegalScreenProps = NativeStackScreenProps<AppStackParamList, "Legal">;

type Section = { heading: string; body: readonly string[] };
type LegalDocument = { title: string; updated: string; intro: string; sections: readonly Section[] };

const PRIVACY: LegalDocument = {
  title: "Privacy policy",
  updated: "Last updated August 2026",
  intro:
    "SwiftChoice is a university project built by three students for INT3506 at the Academy of Interactive Technology (AIT). It is not a commercial service and it is not sold or advertised. This page describes what the app does with your information.",
  sections: [
    {
      heading: "What we collect",
      body: [
        "An email address and password, so you can sign in. The password is handled by Firebase Authentication and the app never sees it.",
        "The decisions you accept, with the option you chose and the filters you set.",
        "The tasks you add to Priority, with any deadline and note you give them.",
        "Your location, when you search for somewhere to eat or ask for a study spot.",
      ],
    },
    {
      heading: "Where it goes",
      body: [
        "Accepted decisions are copied to your account, which is held in Google Firebase in Sydney.",
        "When you search in Eat Out, your location or the area you type is sent to Google so it can return places nearby.",
        "When you ask for a study spot, your location is sent to a weather service so the app can tell you whether to take a jacket or an umbrella.",
        "When two or more Priority tasks score exactly the same and you rank them, those tasks are sent to a small server we run, which passes them to Google's Gemini service to break the tie and explain the order. Only the tied tasks go, never the whole list.",
        "Nothing identifying you is sent to Google or to the weather service. The location services receive a position, not a person, and the tie-break receives task text with no account, name or device attached to it.",
        "Our server keeps no copy of what passes through it. It holds the key that talks to Google, which is the reason it exists at all: without it that key would have to ship inside the app, where anyone could read it.",
      ],
    },
    {
      heading: "What stays on your phone",
      body: [
        "Your preferences, your Fuel and Focus pools, your decision history, your XP and level, your theme, your avatar, your two-factor key, and your Priority tasks.",
        "Priority tasks stay here with the one exception described above, which is the tied ones sent to break a draw. A task you never rank against an equal never leaves.",
        "The two-factor key never leaves the device, which is why it protects this phone rather than your account.",
      ],
    },
    {
      heading: "What we do not do",
      body: [
        "The app contains no advertising and no analytics or tracking code.",
        "Your information is not sold or shared with anyone beyond the services named above.",
      ],
    },
    {
      heading: "Removing your information",
      body: [
        "Clear Local Data, in Settings, removes everything held on the device. Decisions already copied to your account are not affected by it.",
        "Deleting your account removes the account and the decisions stored against it.",
      ],
    },
    {
      heading: "Getting in touch",
      body: [
        "SwiftChoice is coursework, so there is no support desk. Questions go to the project team through the unit.",
        "The three of us built it, and the code is public. Yvonne Gitonga, github.com/gakey1. Bikash Adhikari, github.com/beekas-adhikari. Tracy Nguyen, github.com/tracysnowy.",
      ],
    },
  ],
};

const TERMS: LegalDocument = {
  title: "Terms of use",
  updated: "Last updated August 2026",
  intro:
    "SwiftChoice is a university project built for INT3506 at the Academy of Interactive Technology (AIT). Using it means accepting the short list below.",
  sections: [
    {
      heading: "What this is",
      body: [
        "Student coursework, built to be assessed. It is not a finished product and it is not offered for sale.",
      ],
    },
    {
      heading: "Suggestions, not advice",
      body: [
        "Every recommendation is a suggestion produced by matching your filters against a list. It is not professional, dietary, health or financial advice, and the choice remains yours.",
        "Place information comes from Google and weather from an outside service. Neither is checked by us, so opening hours, prices and forecasts can be wrong.",
      ],
    },
    {
      // The one number in the app that is not counted, so the basis for it is
      // written down where a user can find it. Keep this in step with
      // ASSUMED_MINUTES_WITHOUT_APP in features/history/historyStats.
      heading: "How the time saved figure works",
      body: [
        "The Avg. saved figure on the home screen is an estimate, not a measurement of your actual saving.",
        "It assumes a decision like this would take about 8 minutes without the app, and subtracts how long you actually took, which we do measure. Decisions made before we started recording that are left out rather than guessed at.",
        "The 8 minutes is a deliberately cautious estimate. In our own survey of 21 students, 38% said they spend more than 20 minutes deliberating before acting, so the figure we use is well below what our research found.",
      ],
    },
    {
      heading: "No guarantees",
      body: [
        "The app is provided as it is. It may contain faults, it may be unavailable, and information you store in it may be lost.",
        "Keep nothing in SwiftChoice that you cannot afford to lose.",
      ],
    },
    {
      heading: "Your account",
      body: [
        "You are responsible for your own password and for what happens under your account.",
        "Do not use the app to store anything unlawful, and do not use somebody else's account.",
      ],
    },
    {
      heading: "Ending it",
      body: [
        "You can delete your account at any time from Settings.",
        "The project is coursework, so the service behind it is not permanent and may stop after the unit ends.",
      ],
    },
  ],
};

export function LegalScreen({ navigation, route }: LegalScreenProps) {
  const { colors } = useTheme();
  const document = route.params.document === "terms" ? TERMS : PRIVACY;

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

        <Text style={[styles.title, { color: colors.ink }]}>{document.title}</Text>
        <Text style={[styles.updated, { color: colors.ink3 }]}>{document.updated}</Text>
        <Text style={[styles.intro, { color: colors.ink2 }]}>{document.intro}</Text>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.ink }]}>{section.heading}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={[styles.body, { color: colors.ink2 }]}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
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
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.title },
  updated: { fontFamily: T.font.mono, fontSize: 11, marginTop: 4, marginBottom: T.spacing[3] },
  intro: { fontSize: T.fontSize.body, lineHeight: 21, marginBottom: T.spacing[5] },
  section: { marginBottom: T.spacing[5] },
  heading: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle, marginBottom: T.spacing[2] },
  body: { fontSize: 13.5, lineHeight: 19, marginBottom: T.spacing[2] },
});
