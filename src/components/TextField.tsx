// Labelled text input with an inline error slot. Shared by the auth screens
// (register, login). Neutral teal-surface styling; no module-colour scoping.

import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { T } from "@/theme/tokens";

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

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  testID,
  ...inputProps
}: TextFieldProps) {
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
});
