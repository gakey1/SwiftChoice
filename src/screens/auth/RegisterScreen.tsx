// The sign up screen. It checks what the user typed, creates the account, and
// then lets the auth listener move them into the app.
//
// The design system only covers the logged-in screens, so this screen is built
// in the same style: the warm background, the logo, DM Sans, the shared
// TextField, and the Button. Sign up uses the teal look that is allowed
// everywhere, so the module colours do not apply here.

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { registerErrorMessage } from "@/features/auth/errorMessages";
import { hasErrors, validateRegisterForm, type RegisterErrors } from "@/features/auth/validation";
import type { AuthStackParamList } from "@/navigation/types";
import { registerWithEmail } from "@/services/auth";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Runs when Create account is pressed. Checks the form first and stops if
  // anything is wrong. Otherwise creates the account and shows a message if it fails.
  async function handleRegister() {
    const nextErrors = validateRegisterForm({ email, password, confirmPassword });
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await registerWithEmail(email, password);
      // No screen change here. Creating the account starts the session, the auth
      // listener fires, and RootNavigator swaps to the main app.
    } catch (err) {
      setFormError(registerErrorMessage(err));
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

         <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
      >
         <Text style={[styles.backText, { color: colors.teal }]}>← Back</Text>
         </TouchableOpacity>

  <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.teal }]}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={[styles.wordmark, { color: colors.ink }]}>SwiftChoice</Text>
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.ink2 }]}>One clear choice at a time.</Text>

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
            testID="register-email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            error={errors.password}
            testID="register-password"
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            error={errors.confirmPassword}
            testID="register-confirm"
          />

          {formError ? (
            <Text style={styles.formError} testID="register-form-error">
              {formError}
            </Text>
          ) : null}

          <View style={styles.action}>
            <Button onPress={handleRegister} disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.ink2 }]}>Already have an account? </Text>
            <Text
              style={[styles.footerLink, { color: colors.teal }]}
              accessibilityRole="button"
              onPress={() => navigation.navigate("Login")}
            >
              Log in
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: T.spacing[5] },
  footerText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  footerLink: { fontFamily: T.font.semibold, fontSize: T.fontSize.body },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: T.spacing[4],
  },

  backText: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.body,
  },
});
