// Login screen (US05). Validates input, signs in, and lets the auth state
// listener route to Home. Built in the same language as RegisterScreen.
//
// Every auth error collapses to one generic message (US05 acceptance
// criterion, coding-standards.md §6): the screen never reveals whether the
// email or the password was wrong, which would let an attacker enumerate
// registered accounts.

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { loginErrorMessage } from "@/features/auth/errorMessages";
import { hasErrors, validateLoginForm, type LoginErrors } from "@/features/auth/validation";
import type { AuthStackParamList } from "@/navigation/types";
import { loginWithEmail } from "@/services/auth";
import { T } from "@/theme/tokens";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      // No manual navigation; the auth listener swaps to Home on success.
    } catch (err) {
      setFormError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={styles.wordmark}>SwiftChoice</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to pick up where you left off.</Text>

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

          {formError ? (
            <Text style={styles.formError} testID="login-form-error">
              {formError}
            </Text>
          ) : null}

          <View style={styles.action}>
            <Button onPress={handleLogin} disabled={submitting}>
              {submitting ? "Logging in..." : "Log in"}
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Text
              style={styles.footerLink}
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
  safe: { flex: 1, backgroundColor: T.canvas },
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
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body, color: T.teal },
});
