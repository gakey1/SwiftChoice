// Turning two-factor authentication on or off. Reached from the Security row in
// Settings, and also shown straight after a sign-in where a password change
// invalidated an existing enrolment (D-012), with a banner explaining why.
//
// What this protects, stated plainly because it is easy to overclaim: the secret
// is stored in this phone's keychain and nowhere else, so the code is asked for
// when signing in on this phone. Signing in on a different phone is not
// challenged, because there is no secret there to check against. It is a
// same-device step-up factor, not account-level two-factor authentication.
//
// The current code is shown on screen during setup on purpose. It makes the
// feature demonstrable on a simulator, or from a zip with no second device,
// which is what the marking and the panel demo need.

import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import {
  buildOtpauthUri,
  generateCode,
  generateSecret,
  secondsUntilRotation,
  verifyCode,
} from "@/features/auth/totp";
import type { AppStackParamList } from "@/navigation/types";
import {
  clearTotpSecret,
  getTotpSecret,
  saveTotpSecret,
} from "@/services/localdb/totpStorage";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type TwoFactorSetupScreenProps = NativeStackScreenProps<
  AppStackParamList,
  "TwoFactorSetup"
>;

export function TwoFactorSetupScreen({
  navigation,
  route,
}: TwoFactorSetupScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const accountLabel = user?.email ?? "SwiftChoice";
  const invalidatedByPasswordChange = route.params?.reason === "password-changed";

  // null while the stored secret is still being read.
  const [enrolledSecret, setEnrolledSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // The not-yet-confirmed secret, held only while the user is setting up. It is
  // saved once they prove they can read a code from it, so a half-finished
  // setup never leaves them locked behind a factor they cannot satisfy.
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [typedCode, setTypedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const secret = await getTotpSecret();
      if (active) {
        setEnrolledSecret(secret);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keeps the on-screen demo code current while setting up. Ticks every second
  // so the countdown moves, which is what makes it obvious the code rotates
  // rather than being a fixed number.
  useEffect(() => {
    if (!pendingSecret) return undefined;

    const tick = () => {
      setDemoCode(generateCode(pendingSecret, accountLabel));
      setSecondsLeft(secondsUntilRotation(new Date()));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pendingSecret, accountLabel]);

  const handleBegin = useCallback(() => {
    setError(null);
    setTypedCode("");
    setPendingSecret(generateSecret());
  }, []);

  async function handleConfirm() {
    if (!pendingSecret) return;
    setError(null);

    if (!verifyCode(pendingSecret, accountLabel, typedCode)) {
      setError("That code did not match. Check your authenticator and try again.");
      return;
    }

    await saveTotpSecret(pendingSecret);
    setEnrolledSecret(pendingSecret);
    setPendingSecret(null);
    setTypedCode("");
  }

  async function handleTurnOff() {
    await clearTotpSecret();
    setEnrolledSecret(null);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.ink }]}>
          Two-factor authentication
        </Text>

        {invalidatedByPasswordChange ? (
          <View style={[styles.banner, { borderColor: colors.teal }]}>
            <Text style={[styles.bannerText, { color: colors.ink }]} testID="totp-reset-banner">
              Your password changed, so two-factor authentication was turned off
              on this phone. Set it up again to switch it back on. You do not
              need your old authenticator entry, this creates a new one.
            </Text>
          </View>
        ) : null}

        <Text style={[styles.body, { color: colors.ink2 }]}>
          Adds a six-digit code from an authenticator app when you sign in on
          this phone. The code changes every 30 seconds and is worked out on the
          device, so it keeps working with no signal.
        </Text>
        <Text style={[styles.body, { color: colors.ink2 }]}>
          It protects sign-ins on this phone only. Signing in on a different
          phone is not asked for a code, because the key is kept in the secure
          storage on this phone and is not copied anywhere.
        </Text>

        {loading ? (
          <Text style={[styles.body, { color: colors.ink2 }]}>Checking...</Text>
        ) : enrolledSecret ? (
          <>
            <Text style={[styles.status, { color: colors.ink }]} testID="totp-status-on">
              Two-factor authentication is on for this phone.
            </Text>
            <View style={styles.action}>
              <Button variant="reroll" onPress={handleTurnOff}>
                Turn off
              </Button>
            </View>
          </>
        ) : pendingSecret ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
              STEP 1, ADD THE KEY
            </Text>
            <Text style={[styles.body, { color: colors.ink2 }]}>
              In your authenticator app choose to add an account by entering a
              key, and type this in.
            </Text>
            <Text style={[styles.secret, { color: colors.ink }]} testID="totp-secret">
              {pendingSecret}
            </Text>
            <Text style={[styles.uri, { color: colors.ink3 }]} testID="totp-uri">
              {buildOtpauthUri(pendingSecret, accountLabel)}
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
              STEP 2, CONFIRM
            </Text>
            <Text style={[styles.body, { color: colors.ink2 }]}>
              Type the six digits your app is showing now. This proves the key
              was added correctly before it is switched on.
            </Text>

            <View style={[styles.demo, { borderColor: colors.cardLine }]}>
              <Text style={[styles.demoLabel, { color: colors.ink3 }]}>
                CODE ON THIS DEVICE, FOR TESTING WITHOUT A SECOND PHONE
              </Text>
              <Text style={[styles.demoCode, { color: colors.ink }]} testID="totp-demo-code">
                {demoCode}
              </Text>
              <Text style={[styles.demoLabel, { color: colors.ink3 }]}>
                Changes in {secondsLeft}s
              </Text>
            </View>

            <TextField
              label="Six-digit code"
              value={typedCode}
              onChangeText={setTypedCode}
              placeholder="000000"
              keyboardType="number-pad"
              autoCapitalize="none"
              error={error ?? undefined}
              testID="totp-setup-code"
            />

            <View style={styles.action}>
              <Button onPress={handleConfirm}>Turn on</Button>
            </View>
            <View style={styles.actionSecondary}>
              <Button variant="reroll" onPress={() => setPendingSecret(null)}>
                Cancel
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.status, { color: colors.ink }]} testID="totp-status-off">
              Two-factor authentication is off.
            </Text>
            <View style={styles.action}>
              <Button onPress={handleBegin}>Set it up</Button>
            </View>
          </>
        )}

        <View style={styles.actionSecondary}>
          {/* After a password change this screen is the first thing shown, so
              there is nothing behind it to go back to. Falling through to the
              tabs stops "Not now" from being a dead button. */}
          <Button
            variant="outline"
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs")
            }
          >
            {invalidatedByPasswordChange ? "Not now" : "Back"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  banner: {
    borderWidth: 1.5,
    borderRadius: T.radii.card,
    padding: T.spacing[4],
    marginBottom: T.spacing[4],
  },
  bannerText: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  body: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginBottom: T.spacing[3],
  },
  status: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.subtitle,
    marginTop: T.spacing[2],
    marginBottom: T.spacing[3],
  },
  sectionLabel: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.caption,
    marginTop: T.spacing[4],
    marginBottom: T.spacing[2],
  },
  secret: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.subtitle,
    letterSpacing: 2,
    marginBottom: T.spacing[2],
  },
  uri: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    marginBottom: T.spacing[2],
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
  actionSecondary: { marginTop: T.spacing[3] },
});
