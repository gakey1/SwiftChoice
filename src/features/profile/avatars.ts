// The set of profile avatars the user can pick from. They are the open-source
// DiceBear "bottts" robots, downloaded once and bundled as local PNGs under
// assets/avatars, so the app never fetches them at runtime (no network, nothing
// leaves the device, which keeps the privacy-first pitch intact).
//
// The chosen avatar is shown on the Home player card and in Settings. Which one
// is selected is persisted in profileStorage (the on-device storage slice).

import type { ImageSourcePropType } from "react-native";

export type Avatar = {
  name: string;
  source: ImageSourcePropType;
  // A signature colour, used for the selection glow so each robot feels distinct.
  color: string;
};

export const AVATARS: readonly Avatar[] = [
  { name: "Nova", source: require("../../../assets/avatars/Nova.png"), color: "#B98BFF" },
  { name: "Zed", source: require("../../../assets/avatars/Zed.png"), color: "#22E0C4" },
  { name: "Rex", source: require("../../../assets/avatars/Rex.png"), color: "#FFB23E" },
  { name: "Kai", source: require("../../../assets/avatars/Kai.png"), color: "#43E58E" },
];

// Clamps a stored index to a real avatar, so a bad value never breaks the UI.
export function avatarAt(index: number): Avatar {
  const safe = Number.isInteger(index) && index >= 0 && index < AVATARS.length ? index : 0;
  return AVATARS[safe] ?? AVATARS[0]!;
}
