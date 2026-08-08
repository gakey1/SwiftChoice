// Tests for the card surface.
//
// This is where the regression that mattered lived. Blurring on Android needs a
// target view to snapshot, and that plumbing failed three ways - no target, a
// transparent target the engine clears with the white window background, and
// one target shared across a tab navigator where the last screen to mount wins.
// All three render a WHITE card, none of them raise anything, and the suite
// stayed green through every one. Measured on Medium_Phone_API_36, a card that
// should read rgb(35,27,63) was reading rgb(87,81,110).
//
// The blur is gone on both platforms now, so the test worth having is the
// structural one, asserted on each: no BlurView, and something opaque
// underneath the tint.

import { Platform, View } from "react-native";
import { render } from "@testing-library/react-native";

import { GlassCard } from "./GlassCard";

jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      bg: "#141026",
      card: "rgba(40, 32, 72, 0.72)",
      cardLine: "rgba(180, 150, 255, 0.22)",
    },
    isDark: true,
  }),
}));

function withPlatform(os: "ios" | "android", run: () => void) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
}

const PLATFORMS = ["ios", "android"] as const;

function hasFill(tree: ReturnType<typeof render>, color: string): boolean {
  return tree.UNSAFE_queryAllByType(View).some((node: { props: { style?: unknown } }) =>
    [node.props.style]
      .flat(2)
      .some(
        (s) =>
          typeof s === "object" && s !== null && "backgroundColor" in s && s.backgroundColor === color
      )
  );
}

describe("GlassCard", () => {
  it.each(PLATFORMS)("renders no BlurView on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<GlassCard />);
      expect(tree.UNSAFE_queryAllByType("BlurView" as never)).toHaveLength(0);
    });
  });

  it.each(PLATFORMS)("puts an opaque base under the tint on %s, so a card can never read white", (os) => {
    withPlatform(os, () => {
      const tree = render(<GlassCard />);
      // The opaque bg underneath, then the translucent card tint over it. The
      // two together are what compose to the intended card colour.
      expect(hasFill(tree, "#141026")).toBe(true);
      expect(hasFill(tree, "rgba(40, 32, 72, 0.72)")).toBe(true);
    });
  });
});
