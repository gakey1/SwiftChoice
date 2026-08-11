// Tests for the coin HUD. The coin is a platform split, iOS emoji against
// Android vector art, so the assertions are structural: which one rendered.

// Platform, so a test can choose which one it runs as.
import { Platform } from "react-native";
// Renders a component into a tree the assertions can query.
import { render } from "@testing-library/react-native";
// Supplies the safe-area context the HUD reads.
import { SafeAreaProvider } from "react-native-safe-area-context";

// The component under test.
import { XpHud } from "./XpHud";

// Fixed frame and insets, because the real provider measures asynchronously
// and the first render would come back empty.
const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

// Renders the HUD inside the safe-area context it needs.
function renderHud() {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <XpHud />
    </SafeAreaProvider>
  );
}

// Fixed theme colours, so the HUD does not need the real provider.
jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { cardSolid: "#241C46", cardLine: "rgba(180,150,255,0.22)", fuel: "#FFB23E" },
    isDark: true,
  }),
}));

// A fixed coin count to assert against.
jest.mock("@/features/progress/ProgressProvider", () => ({
  useProgress: () => ({ progress: { coins: 88 } }),
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

describe("XpHud", () => {
  // Android must use the drawn coin, not the emoji font's.
  it("draws the coin on Android rather than asking the emoji font for one", () => {
    withPlatform("android", () => {
      const tree = renderHud();
      expect(tree.queryByText("🪙")).toBeNull();
      expect(tree.queryByTestId("coin-icon")).not.toBeNull();
    });
  });

  // iOS keeps the emoji, which is the look the drawn coin matches.
  it("keeps the emoji on iOS, which is the look being matched to", () => {
    withPlatform("ios", () => {
      const tree = renderHud();
      expect(tree.queryByText("🪙")).not.toBeNull();
      expect(tree.queryByTestId("coin-icon")).toBeNull();
    });
  });

  // The count itself is the same on both.
  it("shows the coin count on both", () => {
    for (const os of ["ios", "android"] as const) {
      withPlatform(os, () => {
        const tree = renderHud();
        expect(tree.getByText("88")).toBeTruthy();
      });
    }
  });
});
