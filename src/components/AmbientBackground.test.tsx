// Tests for the ambient wash. They assert the shape of the output, not how it
// looks: no native blur, one gradient per accent, and an opaque theme fill.
// Both platforms, because the wash must be identical on each.

// Platform, so a test can choose which one it runs as. View, to search the tree
// for a background fill.
import { Platform, View } from "react-native";
// Renders a component into a tree the assertions can query.
import { render } from "@testing-library/react-native";

// The component under test.
import { AmbientBackground } from "./AmbientBackground";

// Fixed theme colours, so the wash does not need the real provider.
jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { bg: "#141026", fuel: "#FFB23E", priority: "#B98BFF", teal: "#22E0C4" },
    isDark: true,
  }),
}));

// Runs the given function with Platform.OS forced to os, then restores it.
// Jest defaults every suite to "ios", so the other one has to be asked for.
function withPlatform(os: "ios" | "android", run: () => void) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
}

// Every case below runs against both.
const PLATFORMS = ["ios", "android"] as const;

// True when any View in the tree has the given background colour. Styles arrive
// as nested arrays, so they are flattened before checking.
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
  // Blur is what made the two platforms diverge, so its absence is pinned.
  it.each(PLATFORMS)("renders no BlurView at all on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<AmbientBackground />);
      expect(tree.UNSAFE_queryAllByType("BlurView" as never)).toHaveLength(0);
    });
  });

  // Three accents, so three radial gradients.
  it.each(PLATFORMS)("draws one radial glow per accent colour on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<AmbientBackground />);
      expect(tree.UNSAFE_queryAllByType("RNSVGRadialGradient" as never)).toHaveLength(3);
    });
  });

  // The glows sit over an opaque base, so the wash can never read washed out.
  it.each(PLATFORMS)("fills opaquely with the theme background on %s", (os) => {
    withPlatform(os, () => {
      expect(hasFill(render(<AmbientBackground />), "#141026")).toBe(true);
    });
  });
});
