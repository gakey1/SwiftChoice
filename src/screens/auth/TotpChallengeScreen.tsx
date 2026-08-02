// The six-digit code asked for after signing in on a phone that has two-factor
// authentication switched on. RootNavigator shows this between the sign-in and
// the app, the same way VerifyEmailScreen sits in front of an unconfirmed
// account: the app screens are not loaded until this passes.
//
// The pass is held in memory only, never saved. Closing and reopening the app
// asks again, which is the point of a step-up factor. Saving "already passed"
// would reduce it to a one-time formality.
//
// The escape is Log out, not Skip. Somebody who cannot produce a code needs a
// way off this screen that does not walk past the factor, and signing out is the
// honest one: it returns them to the login screen with nothing gained.

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { showsDemoCodeOnChallenge } from "@/features/auth/demoCode";
import { generateCode, secondsUntilRotation, verifyCode } from "@/features/auth/totp";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { getTotpSecret } from "@/services/localdb/totpStorage";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type TotpChallengeScreenProps = {
  // Called once the typed code checks out. RootNavigator uses this to let the
  // app through for the rest of this run.
  onPassed: () => void;
};

export function TotpChallengeScreen({ onPassed }: TotpChallengeScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
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

      if (verifyCode(secret, accountLabel, typedCode)) {
        onPassed();
      } else {
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
