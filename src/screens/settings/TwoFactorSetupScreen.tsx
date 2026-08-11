// Turning two-factor authentication on or off, from the Security row in
// Settings. Also shown after a sign-in where a password change invalidated an
// existing enrolment, with a banner explaining why.
//
// A same-device step-up factor, not account-level two-factor authentication:
// the secret lives in this phone's keychain and nowhere else.

// Holds the enrolment state, and drives the rotating demo code.
import { useCallback, useEffect, useState } from "react";
// The layout and the text, plus Linking for handing the key to an
// authenticator app.
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
// Keeps the content clear of the notch.
import { SafeAreaView } from "react-native-safe-area-context";
// The type for this screen's navigation and route props.
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
// Copying the key out, for setting up on the same phone.
import * as Clipboard from "expo-clipboard";
// The QR code an authenticator app scans.
import QRCode from "react-native-qrcode-svg";

// The colour wash behind the content.
import { AmbientBackground } from "@/components/AmbientBackground";
// The shared button and code field.
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
// The signed-in user, whose email labels the enrolment.
import { useAuth } from "@/hooks/useAuth";
// The TOTP maths: minting a secret, showing it, and checking a typed code.
import {
  buildOtpauthUri,
  generateCode,
  generateSecret,
  groupSecret,
  secondsUntilRotation,
  verifyCode,
} from "@/features/auth/totp";
// The screen names this stack can navigate to.
import type { AppStackParamList } from "@/navigation/types";
// The keychain the secret is read from, written to and cleared from.
import {
  clearTotpSecret,
  getTotpSecret,
  saveTotpSecret,
} from "@/services/localdb/totpStorage";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// route.params.reason is set when a password change forced the user back here.
type TwoFactorSetupScreenProps = NativeStackScreenProps<
  AppStackParamList,
  "TwoFactorSetup"
>;

// Three states in one screen: reading the stored secret, enrolled, and setting
// up. Which one shows is decided by enrolledSecret and pendingSecret below.
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
  const [copied, setCopied] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  // Reads the stored secret once on open, which decides whether this screen
  // shows the enrolled state or the setup flow. The `active` guard stops a late
  // read setting state after the screen has gone.
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
    setCopied(false);
    setHandoffError(null);
    setPendingSecret(generateSecret());
  }, []);

  // Hands the whole enrolment to an authenticator app in one tap. The otpauth
  // URI is a real URL scheme that authenticator apps register themselves
  // against, so this is the answer for somebody whose authenticator is on the
  // same phone as SwiftChoice and therefore cannot photograph its own screen.
  //
  // Deliberately not gated behind Linking.canOpenURL. On Android 11 and later
  // that returns false for any scheme not declared in a <queries> block in the
  // manifest, even when a handler is installed, so gating on it would hide a
  // working button on most current phones. Trying and catching gives the right
  // answer on every platform.
  async function handleOpenInAuthenticator() {
    if (!pendingSecret) return;
    setHandoffError(null);
    try {
      await Linking.openURL(buildOtpauthUri(pendingSecret, accountLabel));
    } catch {
      setHandoffError(
        "No authenticator app answered. Scan the square above, or add the key by hand."
      );
    }
  }

  // Copies the unspaced secret. The version on screen is spaced for reading;
  // authenticator apps ignore whitespace either way, but the bare form is the
  // one that survives being pasted somewhere stricter.
  async function handleCopyKey() {
    if (!pendingSecret) return;
    await Clipboard.setStringAsync(pendingSecret);
    setCopied(true);
  }

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

        {/* Deliberately short. An earlier version explained the same-device
            limit across two paragraphs and read as a disclaimer, which buried
            the three enrolment options underneath it. The scope claim still has
            to be here and has to be accurate, so it is kept as the last
            sentence rather than dropped. */}
        <Text style={[styles.body, { color: colors.ink2 }]}>
          Asks for a six-digit code from an authenticator app when you sign in
          on this phone. Codes change every 30 seconds and work with no signal.
          This covers this phone only, because the key never leaves it.
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
            <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>
              STEP 1, ADD THE KEY
            </Text>
            {/* The three options are separated by an explicit "or" because
                without one they read as a sequence: scan the square, then press
                the button, then type the key. Everybody on the team read it
                that way and missed the one-tap handoff entirely, assuming it
                was something that happened after scanning. */}
            <Text style={[styles.body, { color: colors.ink2 }]}>
              Any one of these three will do it. Pick the one that suits the
              phone you are on.
            </Text>

            {/* The square is always black on white, whatever the theme is
                doing. A scanner needs the contrast and the quiet border around
                the edge, so this is a functional colour rather than a styling
                one. */}
            <View style={styles.qrWrap} testID="totp-qr">
              <View style={styles.qrPaper}>
                <QRCode
                  value={buildOtpauthUri(pendingSecret, accountLabel)}
                  size={180}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={[styles.qrCaption, { color: colors.ink3 }]}>
                Scan this with the authenticator app on another phone.
              </Text>
            </View>

            <Text style={[styles.or, { color: colors.ink3 }]}>or</Text>

            <View style={styles.action}>
              <Button variant="outline" onPress={() => void handleOpenInAuthenticator()}>
                Open in your authenticator app
              </Button>
            </View>
            <Text style={[styles.hint, { color: colors.ink3 }]}>
              Use this one if your authenticator app is on this same phone,
              where the camera cannot reach the screen.
            </Text>
            {handoffError ? (
              <Text style={[styles.hint, { color: colors.ink2 }]} testID="totp-handoff-error">
                {handoffError}
              </Text>
            ) : null}

            <Text style={[styles.or, { color: colors.ink3 }]}>or</Text>

            <Text style={[styles.body, { color: colors.ink2 }]}>
              In your authenticator app, add an account by entering a key, and
              type this in.
            </Text>
            <Text style={[styles.secret, { color: colors.ink }]} testID="totp-secret">
              {groupSecret(pendingSecret)}
            </Text>
            <View style={styles.actionSecondary}>
              <Button variant="reroll" onPress={() => void handleCopyKey()}>
                {copied ? "Key copied" : "Copy key"}
              </Button>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>
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
    fontFamily: T.font.bold,
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
  qrWrap: {
    alignItems: "center",
    marginBottom: T.spacing[3],
  },
  qrPaper: {
    backgroundColor: "#FFFFFF",
    padding: T.spacing[3],
    borderRadius: T.radii.card,
  },
  qrCaption: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    textAlign: "center",
    marginTop: T.spacing[2],
  },
  hint: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    marginTop: T.spacing[2],
    marginBottom: T.spacing[2],
  },
  // Sits between the three enrolment options. Centred and quiet on purpose: it
  // is a separator, not a heading, and it should read as the word between two
  // choices rather than as another instruction.
  or: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    textAlign: "center",
    marginVertical: T.spacing[2],
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
