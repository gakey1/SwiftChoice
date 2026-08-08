// Tests for the shared celebration burst.
//
// The one that matters is "outlives the screen that asked for it". That is the
// whole reason this sits above the navigator: Accept celebrates and navigates
// away in the same handler, so a burst owned by the screen would be unmounted
// in the same frame and never seen. If that test ever goes green with the
// provider removed, the feature is silently broken again.

import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";

import { CelebrationProvider, useCelebration } from "./Celebration";

jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { priority: "#6438C9", teal: "#0A7A6C", fuel: "#B46B00", focus: "#1E7A46" },
  }),
}));

// Stands in for a screen: it can celebrate, and it can unmount itself the way
// navigating away does.
function FakeScreen({ onReady }: { onReady: (celebrate: () => void) => void }) {
  const { celebrate } = useCelebration();
  onReady(celebrate);
  return <Text>screen</Text>;
}

function countParticles(tree: ReturnType<typeof render>): number {
  // queryByTestId rather than getByTestId: "no layer at all" is a valid state
  // here, and the get form throws instead of answering.
  const layer = tree.queryByTestId("celebration-layer");
  if (layer === null) return 0;
  return (layer.props.children as unknown[]).length;
}

describe("CelebrationProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing until something asks to celebrate", () => {
    const tree = render(
      <CelebrationProvider>
        <FakeScreen onReady={() => {}} />
      </CelebrationProvider>
    );

    expect(countParticles(tree)).toBe(0);
  });

  it("shows a burst of particles when a screen celebrates", () => {
    let fire: () => void = () => {};
    const tree = render(
      <CelebrationProvider>
        <FakeScreen onReady={(celebrate) => (fire = celebrate)} />
      </CelebrationProvider>
    );

    act(() => fire());

    expect(countParticles(tree)).toBeGreaterThan(0);
  });

  it("keeps the burst after the screen that asked for it goes away", () => {
    // The defect this guards. Accept fires the burst and navigates back in the
    // same handler, so a burst belonging to the screen would be unmounted
    // before a single frame of it was drawn.
    let fire: () => void = () => {};

    function Harness({ showScreen }: { showScreen: boolean }) {
      return (
        <CelebrationProvider>
          {showScreen ? <FakeScreen onReady={(celebrate) => (fire = celebrate)} /> : <Text>home</Text>}
        </CelebrationProvider>
      );
    }

    const tree = render(<Harness showScreen />);
    act(() => fire());
    const during = countParticles(tree);

    // The screen navigates away.
    tree.rerender(<Harness showScreen={false} />);

    expect(during).toBeGreaterThan(0);
    expect(countParticles(tree)).toBe(during);
  });

  it("clears the particles once the burst is over", () => {
    let fire: () => void = () => {};
    const tree = render(
      <CelebrationProvider>
        <FakeScreen onReady={(celebrate) => (fire = celebrate)} />
      </CelebrationProvider>
    );

    act(() => fire());
    expect(countParticles(tree)).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(countParticles(tree)).toBe(0);
  });

  it("does not throw when used without a provider", () => {
    // Decoration must never take a screen down with it. Rendering a screen
    // outside the provider, which every screen unit test does, has to be safe.
    expect(() =>
      render(<FakeScreen onReady={(celebrate) => celebrate()} />)
    ).not.toThrow();
  });
});
