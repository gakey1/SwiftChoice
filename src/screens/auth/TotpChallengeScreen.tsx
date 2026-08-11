// The six-digit code asked for after signing in on an enrolled phone.
// RootNavigator shows this between sign-in and the app, so no app screen loads
// until it passes.
//
// The pass is held in memory only. Reopening the app asks again, which is the
// point of a step-up factor, and the escape is Log out rather than Skip.

// Holds the typed code and the demo display, and drives the countdown.
import { useEffect, useState } from "react";
// The layout, the keyboard handling and the text.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
// Keeps the content clear of the notch and the home indicator.
import { SafeAreaView } from "react-native-safe-area-context";

// The colour wash behind the form.
import { AmbientBackground } from "@/components/AmbientBackground";
// The shared button and text field.
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
// Whether this build may print the code on screen.
import { showsDemoCodeOnChallenge } from "@/features/auth/demoCode";
// The TOTP maths: the current code, its countdown, and the check itself.
import { generateCode, secondsUntilRotation, verifyCode } from "@/features/auth/totp";
// The signed-in user, whose email labels the TOTP account.
import { useAuth } from "@/hooks/useAuth";
// The only way off this screen without a code.
import { logout } from "@/services/auth";
// The secret stored on this device at enrolment.
import { getTotpSecret } from "@/services/localdb/totpStorage";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// Owned by RootNavigator rather than a stack, so this takes a callback instead
// of a navigation prop.
type TotpChallengeScreenProps = {
  // Called once the typed code checks out. RootNavigator uses this to let the
  // app through for the rest of this run.
  onPassed: () => void;
};

// Draws the code field, and the demo display in development builds.
export function TotpChallengeScreen({ onPassed }: TotpChallengeScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  // The label has to match the one used at enrolment, or the codes will not
  // agree. The fallback covers a session with no email on it.
  const accountLabel = user?.email ?? "SwiftChoice";

  const [typedCode, setTypedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Development builds only. On this screen the demo code is the answer written
  // on the gate, so a release build has to ask a real question. See
  // features/auth/demoCode.ts for why setup keeps it and this screen does not.
  const showDemoCode = showsDemoCodeOnChallenge();

  // Recomputes the demo code and its countdown once a second, so the screen
  // shows a code that visibly rotates rather than a frozen number.
  //
  // `active` guards against the async tick landing after the screen has gone,
  // which would set state on an unmounted component. The cleanup clears both
  // the flag and the interval, so nothing survives the screen.
  useEffect(() => {
    if (!showDemoCode) return undefined;

    let active = true;
    const tick = async () => {
      const secret = await getTotpSecret();
      if (!active || !secret) return;
      setDemoCode(generateCode(secret, accountLabel));
      setSecondsLeft(secondsUntilRotation(new Date()));
    };
    void tick();
    const timer = setInterval(() => void tick(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [accountLabel, showDemoCode]);

  // Reads the secret, then checks the typed code against it.
  async function handleVerify() {
    setError(null);
    setChecking(true);
    try {
      const secret = await getTotpSecret();
      if (!secret) {
        // No secret means nothing to check against. Letting them through is
        // correct rather than generous: this screen only renders because a
        // secret was found a moment ago, so reaching here means it was removed
        // in between, and trapping somebody behind a factor that no longer
        // exists would lock them out of their own account.
        onPassed();
        return;
      }

      // verifyCode accepts the neighbouring time windows as well as the current
      // one, so a slow typist or a slightly wrong device clock still passes.
      if (verifyCode(secret, accountLabel, typedCode)) {
        onPassed();
      } else {
        // One message for every wrong code. There is nothing more specific to
        // say, and the code is gone in 30 seconds either way.
        setError("That code is not right. Check your authenticator and try again.");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <AmbientBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.teal }]}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={[styles.wordmark, { color: colors.ink }]}>SwiftChoice</Text>
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>Enter your code</Text>
          <Text style={[styles.subtitle, { color: colors.ink2 }]}>
            Open your authenticator app and type the six digits it shows for
            SwiftChoice.
          </Text>

          {/* The demo panel, labelled as such so nobody mistakes it for part of
              the product. Absent from release builds entirely. */}
          {showDemoCode ? (
            <View style={[styles.demo, { borderColor: colors.cardLine }]}>
              <Text style={[styles.demoLabel, { color: colors.ink3 }]}>
                CODE ON THIS DEVICE, DEVELOPMENT BUILDS ONLY
              </Text>
              <Text
                style={[styles.demoCode, { color: colors.ink }]}
                testID="totp-challenge-demo-code"
              >
                {demoCode}
              </Text>
              <Text style={[styles.demoLabel, { color: colors.ink3 }]}>
                Changes in {secondsLeft}s
              </Text>
            </View>
          ) : null}

          {/* number-pad, since the code is always six digits. */}
          <TextField
            label="Six-digit code"
            value={typedCode}
            onChangeText={setTypedCode}
            placeholder="000000"
            keyboardType="number-pad"
            autoCapitalize="none"
            error={error ?? undefined}
            testID="totp-challenge-code"
          />

          <View style={styles.action}>
            <Button onPress={handleVerify} disabled={checking}>
              {checking ? "Checking..." : "Continue"}
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.ink2 }]}>
              Cannot get a code?{" "}
            </Text>
            <Text
              style={[styles.footerLink, { color: colors.teal }]}
              accessibilityRole="button"
              onPress={() => logout()}
            >
              Log out
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// The page frame and wordmark shared with the other auth screens, plus the demo
// panel: a bordered box whose code is set in the display size with wide letter
// spacing, so it can be read off one device and typed into another. Colours are
// applied above, so all of this follows the dark/light toggle.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[6],
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
  demo: {
    borderWidth: 1,
    borderRadius: T.radii.card,
    padding: T.spacing[3],
    alignItems: "center",
    marginBottom: T.spacing[4],
  },
  demoLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  demoCode: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    letterSpacing: 4,
    marginVertical: T.spacing[1],
  },
  action: { marginTop: T.spacing[2] },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body },
});
