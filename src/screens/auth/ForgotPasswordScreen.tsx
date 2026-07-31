// The screen for someone who cannot remember their password. They type their
// email, Firebase sends them a reset link, and they set a new password in the
// browser rather than in the app.
//
// The confirmation is deliberately the same whether or not an account exists for
// that address. Login already refuses to say which emails are registered, and
// this screen would undo that work if it answered the question here instead.
// That is why the success message says "if that email has an account" rather
// than promising a link is on its way.

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { passwordResetErrorMessage } from "@/features/auth/errorMessages";
import { validateEmail } from "@/features/auth/validation";
import type { AuthStackParamList } from "@/navigation/types";
import { sendPasswordReset } from "@/services/auth";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Runs when the send button is pressed. Checks the email on the device first,
  // then asks Firebase to send the link.
  //
  // The catch is the unusual part. passwordResetErrorMessage returns null for
  // the errors that would reveal whether the account exists, and null is treated
  // as success here on purpose, so an unregistered address ends on the same
  // confirmation as a registered one.
  async function handleSend() {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(null);
    if (nextEmailError) return;

    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      const message = passwordResetErrorMessage(err);
      if (message === null) {
        setSent(true);
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
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

          {sent ? (
            <>
              <Text style={[styles.title, { color: colors.ink }]}>Check your email</Text>
              {/* The wording stays conditional on purpose. Saying "we sent you a
                  link" would confirm the address is registered. */}
              <Text
                style={[styles.subtitle, { color: colors.ink2 }]}
                testID="forgot-password-sent"
              >
                If that email has a SwiftChoice account, a reset link is on its
                way. Open it to choose a new password. If it is not in your
                inbox, check your spam or junk folder.
              </Text>

              <View style={styles.action}>
                <Button onPress={() => navigation.navigate("Login")}>Back to log in</Button>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.ink }]}>Reset your password</Text>
              <Text style={[styles.subtitle, { color: colors.ink2 }]}>
                Enter the email you signed up with and we will send you a link to
                set a new password.
              </Text>

              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={emailError}
                testID="forgot-password-email"
              />

              {formError ? (
                <Text style={styles.formError} testID="forgot-password-form-error">
                  {formError}
                </Text>
              ) : null}

              <View style={styles.action}>
                <Button onPress={handleSend} disabled={submitting}>
                  {submitting ? "Sending..." : "Send reset link"}
                </Button>
              </View>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.ink2 }]}>
                  Remembered it?{" "}
                </Text>
                <Text
                  style={[styles.footerLink, { color: colors.teal }]}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate("Login")}
                >
                  Back to log in
                </Text>
              </View>
            </>
          )}
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
    marginBottom: T.spacing[6],
  },
  formError: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.badgeHigh,
    marginBottom: T.spacing[4],
  },
  action: { marginTop: T.spacing[2] },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body },
});
