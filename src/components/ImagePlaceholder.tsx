// A rounded box with a soft gradient and a small picture icon in the middle. It
// stands in for a real photo on the recommendation cards until actual photos
// are added.

// The stylesheet for the box.
import { StyleSheet } from "react-native";
// Draws the two-colour background.
import { LinearGradient } from "expo-linear-gradient";

// The picture glyph shown in the centre.
import { Icon } from "@/components/Icon";

// The two moods the box can take.
type Tone = "warm" | "cool";

// The colour pair each tone fades between.
const TONES: Record<Tone, [string, string]> = {
  warm: ["#EFE7DB", "#E7DCCB"],
  cool: ["#E2EAE8", "#D6E3DF"],
};

// All optional, so a caller can drop the placeholder in with no props at all.
export type ImagePlaceholderProps = {
  tone?: Tone;
  height?: number;
  radius?: number;
};

// Draws the gradient box with the picture icon centred in it.
export function ImagePlaceholder({
  tone = "warm",
  height = 150,
  radius = 14,
}: ImagePlaceholderProps) {
  return (
    <LinearGradient
      colors={TONES[tone]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { height, borderRadius: radius }]}
    >
      <Icon name="image" size={28} color="rgba(0,0,0,0.18)" />
    </LinearGradient>
  );
}

// Centres the icon and clips the gradient to the rounded corners. Height and
// radius are set above, since a caller can change them.
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
