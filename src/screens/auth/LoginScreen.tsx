// The login screen. Validates what was typed, signs the user in, and lets the
// auth listener move them into the app. Built like the register screen.

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { loginErrorMessage } from "@/features/auth/errorMessages";
import { hasErrors, validateLoginForm, type LoginErrors } from "@/features/auth/validation";
import type { AuthStackParamList } from "@/navigation/types";
import { loginWithEmail } from "@/services/auth";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Two separate error slots, because they answer different questions. errors
  // is per field and comes from local validation; formError is one message for
  // the whole attempt and comes back from Firebase.
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Guards against a double submit while the request is in flight.
  const [submitting, setSubmitting] = useState(false);

  // Validate first, then submit. Checking locally means an empty form never
  // costs a network round trip, and the user gets an answer immediately.
  async function handleLogin() {
    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      // Nothing navigates here on purpose. The auth listener in useAuth sees the
      // signed-in user and swaps the navigator, so there is one path into the
      // app whether the user just logged in or was already signed in at launch.
    } catch (err) {
      // Every sign-in failure collapses to one general message. Saying whether
      // the email or the password was wrong would let someone probe which
      // addresses are registered.
      setFormError(loginErrorMessage(err));
    } finally {
      // finally, so the button is re-enabled on the failure path too and the
      // user is not locked out of retrying.
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <AmbientBackground />
      {/* The keyboard covers the lower half of a phone, so the form is lifted
          out from under it. Only iOS needs the padding behaviour; Android
          already resizes the window itself, and doing both double-shifts it. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* keyboardShouldPersistTaps="handled" lets a tap on Log in register
            while the keyboard is open. Without it the first tap only dismisses
            the keyboard and the button appears not to work. */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.teal }]}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={[styles.wordmark, { color: colors.ink }]}>SwiftChoice</Text>
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.ink2 }]}>
            Log in to pick up where you left off.
          </Text>

          {/* The autofill and keyboard hints matter as much as the label here:
              they are what let a password manager fill the pair, and what stops
              the phone capitalising the first letter of an email address. */}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
            testID="login-email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            error={errors.password}
            testID="login-password"
          />

          {/* The whole-form error sits above the button, where the eye already
              is when the press did not work. Field errors render inside their
              own TextField instead. */}
          {formError ? (
            <Text style={styles.formError} testID="login-form-error">
              {formError}
            </Text>
          ) : null}

          {/* Disabled and relabelled from the same flag, so the button cannot
              say "Logging in..." while still being pressable. */}
          <View style={styles.action}>
            <Button onPress={handleLogin} disabled={submitting}>
              {submitting ? "Logging in..." : "Log in"}
            </Button>
          </View>

          <Text
            style={[styles.resetLink, { color: colors.ink2 }]}
            accessibilityRole="button"
            onPress={() => navigation.navigate("ForgotPassword")}
            testID="login-forgot-password"
          >
            Forgot password?
          </Text>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.ink2 }]}>New here? </Text>
            <Text
              style={[styles.footerLink, { color: colors.teal }]}
              accessibilityRole="button"
              onPress={() => navigation.navigate("Register")}
            >
              Create account
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
    marginBottom: T.spacing[6],
  },
  formError: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.badgeHigh,
    marginBottom: T.spacing[4],
  },
  action: { marginTop: T.spacing[2] },
  resetLink: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.body,
    textAlign: "center",
    marginTop: T.spacing[4],
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body },
});
