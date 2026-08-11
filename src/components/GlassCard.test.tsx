// Tests for the card surface. Both assertions are structural, because the
// failure they guard against is a card rendering white, which a test that only
// checked the card mounted would pass straight through.

// Platform, so a test can choose which one it runs as. View, to search the tree
// for a background fill.
import { Platform, View } from "react-native";
// Renders a component into a tree the assertions can query.
import { render } from "@testing-library/react-native";

// The component under test.
import { GlassCard } from "./GlassCard";

// Fixed theme colours, so the card does not need the real provider.
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

// Runs the given function with Platform.OS forced to os, then restores it.
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

describe("GlassCard", () => {
  // Blurring needs a target view to snapshot, and every way that plumbing fails
  // renders a white card without raising anything. There is no blur to fail.
  it.each(PLATFORMS)("renders no BlurView on %s", (os) => {
    withPlatform(os, () => {
      const tree = render(<GlassCard />);
      expect(tree.UNSAFE_queryAllByType("BlurView" as never)).toHaveLength(0);
    });
  });

  // The opaque base, then the translucent tint over it. The two together are
  // what compose to the intended card colour.
  it.each(PLATFORMS)("puts an opaque base under the tint on %s, so a card can never read white", (os) => {
    withPlatform(os, () => {
      const tree = render(<GlassCard />);
      expect(hasFill(tree, "#141026")).toBe(true);
      expect(hasFill(tree, "rgba(40, 32, 72, 0.72)")).toBe(true);
    });
  });
});
