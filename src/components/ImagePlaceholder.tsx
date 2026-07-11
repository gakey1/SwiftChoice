// A rounded box with a soft gradient and a small picture icon in the middle. It
// stands in for a real photo on the recommendation cards until actual photos are
// added later.

import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/Icon";

type Tone = "warm" | "cool";

// The two colour pairs the gradient can use: a warm one and a cool one.
const TONES: Record<Tone, [string, string]> = {
  warm: ["#EFE7DB", "#E7DCCB"],
  cool: ["#E2EAE8", "#D6E3DF"],
};

export type ImagePlaceholderProps = {
  tone?: Tone;
  height?: number;
  radius?: number;
};

// Draws the gradient box with the picture icon in the centre.
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

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
