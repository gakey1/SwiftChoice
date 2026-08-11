// The screen that asks the user to confirm their email. RootNavigator shows this
// when someone is signed in but has not confirmed their inbox yet. It blocks fake
// sign ups: the main app is not loaded until the user clicks the emailed link
// and Firebase confirms the email is now verified.

// Holds the two busy flags and the shared status line.
import { useState } from "react";
// The layout and the text.
import { StyleSheet, Text, View } from "react-native";
// Keeps the content clear of the notch and the home indicator.
import { SafeAreaView } from "react-native-safe-area-context";

// The colour wash behind the content.
import { AmbientBackground } from "@/components/AmbientBackground";
// The shared button, used for both actions.
import { Button } from "@/components/Button";
// The signed-in user and the re-check that updates emailVerified.
import { useAuth } from "@/hooks/useAuth";
// The two Firebase calls this screen offers.
import { logout, resendVerificationEmail } from "@/services/auth";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// Takes no props: everything it needs comes from useAuth.
export function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { user, refreshEmailVerified } = useAuth();

  // One flag per button rather than one shared "busy". The two actions are
  // independent, and a single flag would disable both while either ran.
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  // One status line shared by both actions, since only the most recent outcome
  // is worth showing and two stacked messages would contradict each other.
  const [status, setStatus] = useState<string | null>(null);

  // Falls back to wording that still reads correctly in the sentences below,
  // rather than printing an empty gap where the address should be.
  const email = user?.email ?? "your email";

  // Verification happens in the user's inbox, outside the app, so there is
  // nothing to listen for. This re-asks Firebase on demand: the user says they
  // have clicked the link, and the app checks rather than takes their word.
  //
  // Nothing here navigates. A verified result re-renders RootNavigator, which
  // swaps this screen for the app, the same one-way-in rule login follows.
  async function handleCheckVerified() {
    setStatus(null);
    setChecking(true);
    try {
      const verified = await refreshEmailVerified();
      // If it is verified, RootNavigator shows the app and this screen goes away.
      // If not, tell them to click the link and try again.
      if (!verified) {
        setStatus("Not verified yet. Click the link in your inbox, then try again.");
      }
    } catch {
      setStatus("Could not check right now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  // Resends the link. The confirmation names the address and mentions spam,
  // because a link that arrived but was filtered looks identical to one that
  // never sent, and that is the most common reason people get stuck here.
  async function handleResend() {
    setStatus(null);
    setResending(true);
    try {
      await resendVerificationEmail();
      setStatus(
        `New link sent to ${email}. If you do not see it, check your spam or junk folder.`
      );
    } catch {
      setStatus("Could not resend right now. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AmbientBackground />
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.teal }]}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={[styles.wordmark, { color: colors.ink }]}>SwiftChoice</Text>
        </View>

        <Text style={[styles.title, { color: colors.ink }]}>Confirm your email</Text>
        <Text style={[styles.subtitle, { color: colors.ink2 }]}>
          We sent a verification link to {email}. Open it to confirm this is a
          real inbox, then come back and continue. If it is not in your inbox,
          check your spam or junk folder.
        </Text>

        {/* The outcome of whichever action ran last. */}
        {status ? (
          <Text style={[styles.status, { color: colors.ink }]} testID="verify-status">
            {status}
          </Text>
        ) : null}

        {/* The main action, styled ahead of Resend, since re-checking is what
            most people are here to do. */}
        <View style={styles.action}>
          <Button onPress={handleCheckVerified} disabled={checking}>
            {checking ? "Checking..." : "I have verified"}
          </Button>
        </View>

        <View style={styles.actionSecondary}>
          <Button variant="reroll" onPress={handleResend} disabled={resending}>
            {resending ? "Sending..." : "Resend link"}
          </Button>
        </View>

        <View style={styles.footer}>
          {/* Worded as an escape rather than a label, so a mistyped email is not
              a trap: the only way out is to sign out and register again. */}
          <Text style={[styles.footerText, { color: colors.ink2 }]}>
            Entered the wrong email?{" "}
          </Text>
          <Text
            style={[styles.footerLink, { color: colors.teal }]}
            accessibilityRole="button"
            onPress={() => logout()}
          >
            Log out and try again
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// The page frame, the wordmark, the headings, the status line, the two stacked
// actions and the footer link. The content is centred rather than top-aligned,
// since this screen is short and has nothing to scroll. Colours are applied
// above, so all of this follows the dark/light toggle.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    justifyContent: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[2],
    marginBottom: T.spacing[6],
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: T.radii.logo,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: T.tealOn, fontFamily: T.font.bold, fontSize: T.fontSize.title },
  wordmark: { fontFamily: T.font.bold, fontSize: T.fontSize.title },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    marginBottom: T.spacing[1],
  },
  subtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    marginBottom: T.spacing[5],
  },
  status: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    marginBottom: T.spacing[4],
  },
  action: { marginTop: T.spacing[1] },
  actionSecondary: { marginTop: T.spacing[3] },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body },
});
