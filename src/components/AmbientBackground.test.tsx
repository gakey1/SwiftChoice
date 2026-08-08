// Tests for the ambient wash.
//
// The thing worth pinning is that no native blur is involved. The wash was
// built as hard circles under a heavy BlurView, and that failed differently on
// each platform without failing loudly on either: Android buried the glows
// under a tint sheet whose opacity is what `intensity` actually controls there,
// and iOS blurred correctly but lifted the whole background to rgb(26,24,35)
// where the theme asks for rgb(20,16,38). Both were invisible to the suite,
// because a green test says nothing about a colour nobody measured.
//
// So these assert the shape of the output rather than how it looks, on both
// platforms, since the whole point is that there is no longer a difference.

import { Platform, View } from "react-native";
import { render } from "@testing-library/react-native";

import { AmbientBackground } from "./AmbientBackground";

jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { bg: "#141026", fuel: "#FFB23E", priority: "#B98BFF", teal: "#22E0C4" },
    isDark: true,
  }),
}));

// Jest defaults every suite to "ios", so a platform-specific regression would
// simply never run unless a test asks for the other one by name.
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

describe("AmbientBackground", () => {
  it.each(PLATFORMS)("renders no BlurView at all on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<AmbientBackground />);
      expect(tree.UNSAFE_queryAllByType("BlurView" as never)).toHaveLength(0);
    });
  });

  it.each(PLATFORMS)("draws one radial glow per accent colour on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<AmbientBackground />);
      expect(tree.UNSAFE_queryAllByType("RNSVGRadialGradient" as never)).toHaveLength(3);
    });
  });

  it.each(PLATFORMS)("fills opaquely with the theme background on %s", (os) => {
    withPlatform(os, () => {
      expect(hasFill(render(<AmbientBackground />), "#141026")).toBe(true);
    });
  });
});
