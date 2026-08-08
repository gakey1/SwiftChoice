// The gold coin in the XP heads-up display, drawn rather than typed.
//
// The HUD originally rendered the 🪙 character. An emoji is not artwork the app
// ships, it is a lookup into whichever emoji font the operating system happens
// to have: Apple Color Emoji on iOS, Noto Color Emoji on Android. The two draw
// the same code point differently - Apple's is a plain gold disc, Google's is a
// brighter coin carrying a small bank motif - so the HUD did not match across
// platforms and no amount of styling could make it, because the glyph is not
// ours to style.
//
// The specific difference is the metal, and it is worth stating because it is
// the opposite of what everyone assumes a coin to be: **Apple draws 🪙 in
// silver, Google draws it in gold.** So the Android HUD read as gold against a
// silver one on iOS, and drawing a nicer gold coin would have fixed the motif
// while leaving the actual complaint untouched.
//
// Apple's artwork cannot simply be bundled to settle it; that font is licensed
// for Apple platforms. So the coin is drawn here instead: a silver disc with a
// rim, a raised inner face and a highlight, which is the shape the iOS glyph
// reads as, in vector form the app actually owns. react-native-svg is already a
// dependency (see AmbientBackground), so this costs nothing new.
//
// Used on Android only. iOS keeps its emoji, which is the look being matched to
// and the platform there is no reason to disturb. If the two should be truly
// identical rather than merely alike, XpHud can render this on both - it is one
// condition, and this component does not care which platform it is on.

import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from "react-native-svg";

export type CoinIconProps = {
  // Bigger than the 14pt the emoji was set at, and deliberately so. A font size
  // is an em box, not a glyph: the emoji fills nearly all of its box, while an
  // SVG only shows the shape drawn inside the viewBox. Matching the numbers
  // produced a coin about two thirds the size of the iOS one, so the drawing
  // fills more of its box (r 11.3 of 12) and the box itself is larger.
  size?: number;
};

export function CoinIcon({ size = 19 }: CoinIconProps) {
  // A 24-unit viewBox so the numbers below read as ordinary icon coordinates
  // regardless of the size it is finally drawn at.
  return (
    <Svg testID="coin-icon" width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        {/* Light at the top left falling to a deeper grey at the bottom right,
            which is what gives a flat disc its sense of being metal. Silver
            needs a wider spread than gold does: the hue carries none of the
            separation, so all of it has to come from the value. */}
        <LinearGradient id="coin-face" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F4F5F8" />
          <Stop offset="0.55" stopColor="#C6CAD3" />
          <Stop offset="1" stopColor="#8F949F" />
        </LinearGradient>
        <LinearGradient id="coin-inner" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#EDEFF3" />
          <Stop offset="1" stopColor="#B0B5C0" />
        </LinearGradient>
      </Defs>

      {/* The coin body, filling almost the whole viewBox so none of the box is
          wasted on padding the emoji does not have. */}
      <Circle cx="12" cy="12" r="11.3" fill="url(#coin-face)" />
      {/* The rim: a darker ring just inside the edge, which is what stops the
          disc reading as a flat dot at this size. */}
      <Circle cx="12" cy="12" r="8.6" fill="none" stroke="#7E838F" strokeWidth="1" opacity={0.55} />
      {/* The raised inner face. */}
      <Circle cx="12" cy="12" r="8.1" fill="url(#coin-inner)" />
      {/* A single soft highlight at the upper left. One is enough; a second
          reads as a reflection rather than as metal. */}
      <Ellipse cx="8.8" cy="8" rx="3.5" ry="2.3" fill="#FFFFFF" opacity={0.55} />
    </Svg>
  );
}
