// Changing your password while signed in, reached from the Account section of
// Settings.
//
// Three fields rather than two: the current password, the new one, and a
// confirmation. The confirmation is here for the same reason it is on the
// registration form, and matters more here, because a typo in a new password
// that nobody checks locks you out of your own account and the only way back is
// the reset email.
//
// A universal screen, so teal only.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Button } from "@/components/Button";
import { changePassword } from "@/features/auth/passwordChange";
import { validateConfirmPassword, validatePassword } from "@/features/auth/validation";
import type { AppStackParamList } from "@/navigation/types";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type ChangePasswordScreenProps = NativeStackScreenProps<AppStackParamList, "ChangePassword">;

type FieldErrors = {
  current?: string | undefined;
  next?: string | undefined;
  confirm?: string | undefined;
  form?: string | undefined;
};

export function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const { colors } = useTheme();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ twoFactorWasReset: boolean } | null>(null);

  async function handleSubmit(): Promise<void> {
    // Checked on the device first, so an obviously bad password never costs a
    // round trip and the message points at the field that caused it.
    const local: FieldErrors = {
      current: current ? undefined : "Enter your current password.",
      next: validatePassword(next),
      confirm: validateConfirmPassword(next, confirm),
    };

    if (local.current ?? local.next ?? local.confirm) {
      setErrors(local);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const result = await changePassword(current, next);

      if (!result.ok) {
        setErrors({ [result.field]: result.message });
        return;
      }

      // Kept on this screen rather than navigating straight back, because the
      // two-factor notice below is the only place the user is told their
      // authenticator no longer works.
      setDone({ twoFactorWasReset: result.twoFactorWasReset });
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    backgroundColor: colors.card,
    borderColor: colors.cardLine,
    color: colors.ink,
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      edges={["top", "left", "right"]}
    >
      <AmbientBackground />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text
          style={[styles.back, { color: colors.ink2 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          Back
        </Text>

        <Text style={[styles.title, { color: colors.ink }]}>Change your password</Text>

        {done ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.teal }]}>
            <Text style={[styles.doneTitle, { color: colors.ink }]}>Password changed</Text>
            <Text style={[styles.doneBody, { color: colors.ink2 }]}>
              Use your new password the next time you sign in.
            </Text>
            {done.twoFactorWasReset ? (
              <Text style={[styles.doneBody, { color: colors.ink2 }]}>
                Two-factor authentication has been switched off on this phone, because the key was
                set up alongside your old password. Turn it back on from Settings to start using it
                again.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={[styles.intro, { color: colors.ink2 }]}>
              Enter your current password, then choose a new one of at least 8 characters.
            </Text>

            <Field
              label="Current password"
              value={current}
              onChangeText={setCurrent}
              error={errors.current}
              editable={!saving}
              style={fieldStyle}
              errorColor={colors.fuel}
              placeholderColor={colors.ink3}
              inkColor={colors.ink}
            />
            <Field
              label="New password"
              value={next}
              onChangeText={setNext}
              error={errors.next}
              editable={!saving}
              style={fieldStyle}
              errorColor={colors.fuel}
              placeholderColor={colors.ink3}
              inkColor={colors.ink}
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
              editable={!saving}
              style={fieldStyle}
              errorColor={colors.fuel}
              placeholderColor={colors.ink3}
              inkColor={colors.ink}
            />

            {errors.form ? (
              <Text style={[styles.error, { color: colors.fuel }]} accessibilityRole="alert">
                {errors.form}
              </Text>
            ) : null}

            <View style={styles.action}>
              <Button variant="reroll" onPress={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : "Change password"}
              </Button>
            </View>

            <Text style={[styles.note, { color: colors.ink2 }]}>
              Changing your password switches two-factor authentication off on this phone, since
              the key was set up alongside the old password. You can turn it back on straight
              after.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// One labelled password field with its error underneath.
function Field({
  label,
  value,
  onChangeText,
  error,
  editable,
  style,
  errorColor,
  placeholderColor,
  inkColor,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | undefined;
  editable: boolean;
  style: { backgroundColor: string; borderColor: string; color: string };
  errorColor: string;
  placeholderColor: string;
  inkColor: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: inkColor }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        editable={editable}
        placeholder={label}
        placeholderTextColor={placeholderColor}
        accessibilityLabel={label}
        style={[styles.input, style, error ? { borderColor: errorColor } : null]}
      />
      {error ? <Text style={[styles.fieldError, { color: errorColor }]}>{error}</Text> : null}
    </View>
  );
}

// Only non-colour properties live here. Colours come from useTheme() inline so
// the screen follows the dark and light themes.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    paddingBottom: T.spacing[6],
  },
  back: { fontSize: T.fontSize.body, marginBottom: T.spacing[4] },
  title: { fontFamily: T.font.bold, fontSize: T.fontSize.title, marginBottom: T.spacing[2] },
  intro: { fontSize: T.fontSize.body, lineHeight: 21, marginBottom: T.spacing[5] },
  field: { marginBottom: T.spacing[4] },
  fieldLabel: { fontFamily: T.font.medium, fontSize: 13, marginBottom: T.spacing[2] },
  input: {
    borderWidth: 1,
    borderRadius: T.radii.card,
    paddingHorizontal: T.spacing[4],
    height: 48,
    fontSize: T.fontSize.body,
  },
  fieldError: { fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  error: { fontSize: 13, lineHeight: 18, marginBottom: T.spacing[2] },
  action: { marginTop: T.spacing[2] },
  note: { fontSize: 12.5, lineHeight: 18, marginTop: T.spacing[4] },
  card: {
    borderWidth: 1,
    borderRadius: T.radii.card,
    padding: T.spacing[4],
    gap: T.spacing[3],
  },
  doneTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  doneBody: { fontSize: 13, lineHeight: 19 },
});
