// The screen that asks the user to confirm their email. RootNavigator shows this
// when someone is signed in but has not confirmed their inbox yet. It blocks fake
// sign ups: the main app is not loaded until the user clicks the emailed link
// and Firebase confirms the email is now verified.

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

  // Runs when "I have verified" is pressed. Asks Firebase again. If the email is
  // now verified the app opens on its own; if not, the user is asked to try again.
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

  // Runs when "Resend link" is pressed. Sends the email again and tells them
  // where to look for it.
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
          real inbox, then come back and continue. If it is not in your inbox,
          check your spam or junk folder.
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
