// Verify-email gate (auth hardening, week-6 demo feedback). Shown by
// RootNavigator when a user is signed in but has not confirmed a real inbox.
// Blocks fake-email sign ups: the app screens are not mounted until the user
// clicks the link we emailed and the reload() confirms emailVerified.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { logout, resendVerificationEmail } from "@/services/auth";
import { T } from "@/theme/tokens";

export function VerifyEmailScreen() {
  const { user, refreshEmailVerified } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const email = user?.email ?? "your email";

  async function handleCheckVerified() {
    setStatus(null);
    setChecking(true);
    try {
      const verified = await refreshEmailVerified();
      // If verified, RootNavigator re-renders and falls through to the app;
      // this screen simply unmounts. If not, tell them to try again.
      if (!verified) {
        setStatus("Not verified yet. Click the link in your inbox, then try again.");
      }
    } catch {
      setStatus("Could not check right now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setStatus(null);
    setResending(true);
    try {
      await resendVerificationEmail();
      setStatus(`New link sent to ${email}.`);
    } catch {
      setStatus("Could not resend right now. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.wordmark}>SwiftChoice</Text>
        </View>

        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to {email}. Open it to confirm this is a
          real inbox, then come back and continue.
        </Text>

        {status ? (
          <Text style={styles.status} testID="verify-status">
            {status}
          </Text>
        ) : null}

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
          <Text style={styles.footerText}>Wrong account? </Text>
          <Text style={styles.footerLink} accessibilityRole="button" onPress={() => logout()}>
            Log out
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.canvas },
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
    backgroundColor: T.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: T.tealOn, fontFamily: T.font.bold, fontSize: T.fontSize.title },
  wordmark: { fontFamily: T.font.bold, fontSize: T.fontSize.title, color: T.fg1 },
  title: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
    marginBottom: T.spacing[1],
  },
  subtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    color: T.fg2,
    marginBottom: T.spacing[5],
  },
  status: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.fg1,
    marginBottom: T.spacing[4],
  },
  action: { marginTop: T.spacing[1] },
  actionSecondary: { marginTop: T.spacing[3] },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body, color: T.teal },
});
