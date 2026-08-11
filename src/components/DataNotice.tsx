// A short line saying what leaves the phone, shown next to the control that
// causes it. Quiet by design, because a notice people dismiss without reading
// looks like consent and is not. Neutral, since all three modules use it.

// The row layout, the sentence, and its stylesheet.
import { StyleSheet, Text, View } from "react-native";

// The small info glyph shown before the sentence.
import { Icon } from "@/components/Icon";
// Design tokens: spacing.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// The notice takes only its sentence.
type DataNoticeProps = {
  // One or two sentences, in plain words, saying exactly what is collected or
  // sent. Anything vaguer than this defeats the point of showing it.
  children: string;
};

// Draws the icon and the sentence as one accessible item.
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

// The icon-and-text row, and the sentence itself, which is deliberately smaller
// than body text. flex: 1 lets it wrap onto a second line beside the icon.
const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: T.spacing[2],
  },
  text: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
