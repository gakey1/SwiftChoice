// Rounded-rectangle image placeholder with a warm or cool gradient and a
// centered image glyph. Used on recommendation cards before real photo
// content lands (Fuel meal photos, Focus location photos).

import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/Icon";

type Tone = "warm" | "cool";

const TONES: Record<Tone, [string, string]> = {
  warm: ["#EFE7DB", "#E7DCCB"],
  cool: ["#E2EAE8", "#D6E3DF"],
};

export type ImagePlaceholderProps = {
  tone?: Tone;
  height?: number;
  radius?: number;
};

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
