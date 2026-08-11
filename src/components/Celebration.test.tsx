// Tests for the shared celebration burst. The one that matters is that a burst
// outlives the screen that fired it: Accept celebrates and navigates away in
// the same handler, so a burst owned by the screen would never be seen.

// A stand-in for screen content.
import { Text } from "react-native";
// render draws the tree; act flushes the state updates a burst causes.
import { act, render } from "@testing-library/react-native";

// The provider under test and the hook screens use to fire a burst.
import { CelebrationProvider, useCelebration } from "./Celebration";

// Fixed particle colours, so the burst does not need the real theme provider.
jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { priority: "#6438C9", teal: "#0A7A6C", fuel: "#B46B00", focus: "#1E7A46" },
  }),
}));

// Stands in for a screen: it can celebrate, and it can be unmounted the way
// navigating away unmounts one.
function FakeScreen({ onReady }: { onReady: (celebrate: () => void) => void }) {
  const { celebrate } = useCelebration();
  onReady(celebrate);
  return <Text>screen</Text>;
}

// How many particles are on screen. Zero covers the case where the overlay is
// not rendered at all, which is why this queries rather than gets.
function countParticles(tree: ReturnType<typeof render>): number {
  const layer = tree.queryByTestId("celebration-layer");
  if (layer === null) return 0;
  return (layer.props.children as unknown[]).length;
}

describe("CelebrationProvider", () => {
  // Fake timers, so the burst's lifetime can be advanced instantly.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Nothing is drawn until a screen asks for it.
  it("renders nothing until something asks to celebrate", () => {
    const tree = render(
      <CelebrationProvider>
        <FakeScreen onReady={() => {}} />
      </CelebrationProvider>
    );

    expect(countParticles(tree)).toBe(0);
  });

  // Firing the hook puts particles on screen.
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

  // The reason the burst lives above the navigator rather than on a screen.
  it("keeps the burst after the screen that asked for it goes away", () => {
    let fire: () => void = () => {};

    // Swapping showScreen off is this test's version of navigating away.
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

    tree.rerender(<Harness showScreen={false} />);

    expect(during).toBeGreaterThan(0);
    expect(countParticles(tree)).toBe(during);
  });

  // Past its lifetime the overlay drops the views instead of holding them.
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

  // Decoration must never take a screen down with it, and every screen unit
  // test renders without the provider.
  it("does not throw when used without a provider", () => {
    expect(() =>
      render(<FakeScreen onReady={(celebrate) => celebrate()} />)
    ).not.toThrow();
  });
});
