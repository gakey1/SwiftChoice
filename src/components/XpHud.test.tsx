// Tests for the coin HUD, and specifically for the platform split in its coin.
//
// The coin used to be the 🪙 character, which is not artwork the app ships but
// a lookup into the operating system's emoji font. Apple's draws a plain gold
// disc, Google's a brighter coin with a bank motif, so the HUD did not match
// across platforms and could not be styled into matching - the glyph is not
// ours. Android now draws CoinIcon instead.
//
// The assertion worth having is the structural one, because the difference is
// invisible to any test that only checks the count renders.

import { Platform } from "react-native";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { XpHud } from "./XpHud";

// The HUD positions itself below the notch, so it needs a safe-area context.
// Fixed frame and insets rather than the real provider's measurements, which
// resolve asynchronously and would make the render empty on first pass.
const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

function renderHud() {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <XpHud />
    </SafeAreaProvider>
  );
}

jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { cardSolid: "#241C46", cardLine: "rgba(180,150,255,0.22)", fuel: "#FFB23E" },
    isDark: true,
  }),
}));

jest.mock("@/features/progress/ProgressProvider", () => ({
  useProgress: () => ({ progress: { coins: 88 } }),
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

describe("XpHud", () => {
  it("draws the coin on Android rather than asking the emoji font for one", () => {
    withPlatform("android", () => {
      const tree = renderHud();
      expect(tree.queryByText("🪙")).toBeNull();
      expect(tree.queryByTestId("coin-icon")).not.toBeNull();
    });
  });

  it("keeps the emoji on iOS, which is the look being matched to", () => {
    withPlatform("ios", () => {
      const tree = renderHud();
      expect(tree.queryByText("🪙")).not.toBeNull();
      expect(tree.queryByTestId("coin-icon")).toBeNull();
    });
  });

  it("shows the coin count on both", () => {
    for (const os of ["ios", "android"] as const) {
      withPlatform(os, () => {
        const tree = renderHud();
        expect(tree.getByText("88")).toBeTruthy();
      });
    }
  });
});
