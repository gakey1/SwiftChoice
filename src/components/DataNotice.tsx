// A short line saying what leaves the phone, shown next to the control that
// causes it. Used for US34.
//
// Two rules shape this component.
//
// It carries no module colour. The same notice appears on Fuel, Focus and
// Priority, and amber, green and purple are each scoped to one module, so a
// notice that picked one up would break that scoping the moment it was reused.
// Everything here is neutral.
//
// It is deliberately quiet. The WBS asks for unobtrusive, and the reason is not
// tidiness: a notice people dismiss without reading looks like consent and is
// not. So this is small text under the control rather than a dialog in front of
// it, and there is nothing to dismiss.

import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type DataNoticeProps = {
  // One or two sentences, in plain words, saying exactly what is collected or
  // sent. Anything vaguer than this defeats the point of showing it.
  children: string;
};

export function DataNotice({ children }: DataNoticeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.wrap}
      // Read as one item rather than an icon and then a sentence, and labelled
      // so a screen reader says what it is before reading it out.
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Data notice. ${children}`}
    >
      <Icon name="info" size={13} color={colors.ink3} />
      <Text style={[styles.text, { color: colors.ink3 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: T.spacing[2],
  },
  text: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
