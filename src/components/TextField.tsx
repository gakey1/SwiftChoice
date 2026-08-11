// A text box with a label above it and room for an error below, used on the
// login and register forms. Themed, except the error red, which stays fixed.

// The label, the box itself, and the wrapper that holds them with the error.
import { StyleSheet, Text, TextInput, View } from "react-native";
// Used to borrow TextInput's own keyboard and autofill types.
import type { TextInputProps } from "react-native";

// Design tokens: fonts, spacing, radii, and the error red.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// The label, the value and its change handler are required; the rest tune the
// keyboard, the error state and the testID.
export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | undefined;
  secureTextEntry?: boolean;
  // The keyboard and autofill props are re-exported from TextInput's own types
  // rather than retyped as strings, so a typo like "email-adress" fails to
  // compile instead of silently giving the user the wrong keyboard.
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  testID?: string;
};

// A controlled input: it holds no state of its own, so the form that owns the
// value is always the single source of truth for what is in the box.
//
// The named props are consumed here; the rest are collected by ...inputProps and
// forwarded to TextInput, so the keyboard and autofill behaviour passes straight
// through without this component needing to know about each one.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  testID,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      {/* Styles are composed as an array, theme colours first and the error
          border last, so the error state overrides the resting border rather
          than the two fighting over which wins. */}
      <TextInput
        style={[
          styles.input,
          { borderColor: colors.cardLine, backgroundColor: colors.chip, color: colors.ink },
          error ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        // The visible label doubles as the accessibility label, so a screen
        // reader announces the same thing a sighted user reads.
        accessibilityLabel={label}
        testID={testID}
        {...inputProps}
      />
      {/* The error is rendered only when present, and its testID is derived
          from the field's own, so a test can target one field's message. */}
      {error ? (
        <Text style={styles.fieldError} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// The field's spacing, its label, the box, and the two error styles. The error
// red is a token rather than a theme colour, so it stays the same in both
// themes and always reads as a warning.
const styles = StyleSheet.create({
  field: {
    marginBottom: T.spacing[4],
  },
  label: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.body,
    marginBottom: T.spacing[2],
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: T.radii.input,
    paddingHorizontal: T.spacing[4],
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
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
});
