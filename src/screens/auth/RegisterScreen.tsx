// Registration screen (US04). Validates input client-side, creates the
// account, and lets the auth state listener handle routing to Home.
//
// The design system is a logged-in-only prototype with no auth screen, so
// this is built in the same visual language: warm canvas, the logo lockup,
// DM Sans, token-styled inputs, and the shared Button atom. Auth is a
// universal teal surface, so module-colour scoping does not apply.

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { registerErrorMessage } from "@/features/auth/errorMessages";
import {
  hasErrors,
  validateRegisterForm,
  type RegisterErrors,
} from "@/features/auth/validation";
import { registerWithEmail } from "@/services/auth";
import { T } from "@/theme/tokens";

export function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    const nextErrors = validateRegisterForm({ email, password, confirmPassword });
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await registerWithEmail(email, password);
      // No manual navigation. registerWithEmail establishes the session,
      // the auth listener fires, and RootNavigator swaps to Home.
    } catch (err) {
      setFormError(registerErrorMessage(err));
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

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>One clear choice at a time.</Text>

          <Field
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
          <Field
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
          <Field
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | undefined;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  testID?: string;
};

function Field({ label, value, onChangeText, placeholder, error, testID, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.fg3}
        accessibilityLabel={label}
        testID={testID}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.fieldError} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  flex: {
    flex: 1,
  },
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
  logoLetter: {
    color: T.tealOn,
    fontFamily: T.font.bold,
    fontSize: T.fontSize.title,
  },
  wordmark: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.title,
    color: T.fg1,
  },
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
  field: {
    marginBottom: T.spacing[4],
  },
  label: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.body,
    color: T.fg1,
    marginBottom: T.spacing[2],
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radii.input,
    backgroundColor: T.surface,
    paddingHorizontal: T.spacing[4],
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    color: T.fg1,
  },
  inputError: {
    borderColor: T.badgeHigh,
  },
  fieldError: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.caption,
    color: T.badgeHigh,
    marginTop: T.spacing[1],
  },
  formError: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.badgeHigh,
    marginBottom: T.spacing[4],
  },
  action: {
    marginTop: T.spacing[2],
  },
});
