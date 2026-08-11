// The coin in the XP heads-up display, drawn as vector art. An emoji is the
// operating system's font rather than artwork the app owns, so it cannot be
// styled into matching across platforms. Rendered on Android only.

// The SVG primitives the coin is built from.
import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from "react-native-svg";

// The only thing a caller sets is how big the coin is.
export type CoinIconProps = {
  // Larger than the font size the emoji uses, deliberately. A font size sets an
  // em box rather than the glyph inside it, so matching the two numbers yields
  // a visibly smaller coin.
  size?: number;
};

// Draws the coin: body, rim, inner face, highlight.
export function CoinIcon({ size = 19 }: CoinIconProps) {
  // A 24-unit viewBox decouples the drawing from the display size: the
  // coordinates below are written once and scale to any size prop.
  return (
    <Svg testID="coin-icon" width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        {/* Light at the top left falling to a deeper grey at the bottom right.
            A directional gradient is what reads as metal; a flat fill reads as
            a dot. Silver needs a wide spread because none of the separation
            comes from hue, so all of it has to come from lightness. */}
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
          wasted on padding. */}
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
