// A text box with a label above it and space for an error message below. Used on
// the login and register forms. Colours come from the active theme (via
// useTheme), so it follows the dark/light Arcade toggle; the error state keeps a
// fixed red.

import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type TextFieldProps = {
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

// Shows the label, the input box, and an error message underneath if there is one.
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
        accessibilityLabel={label}
        testID={testID}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.fieldError} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

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
