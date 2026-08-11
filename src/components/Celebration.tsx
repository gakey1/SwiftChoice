// The confetti burst that acknowledges a decision. It renders above the
// navigator, so a screen can fire one through useCelebration() and navigate
// away in the same handler without the animation going with it.

// React itself, plus the hooks the provider and the burst are built from.
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
// The animation driver, its easing curves, and the views the particles use.
import { Animated, Easing, StyleSheet, View } from "react-native";

// The active theme's colours, which the particles are tinted with.
import { useTheme } from "@/theme/ThemeProvider";

// All three module colours plus teal. The same overlay fires for Fuel, Focus
// and Priority, so tinting it in one module's colour would break the
// module-colour rule the moment another module reused it.
const CELEBRATION_COLORS = ["priority", "teal", "fuel", "focus"] as const;

// How many pieces are in one burst.
const PARTICLE_COUNT = 14;

// How long the slowest particle can take, plus a margin. Used to clear the
// burst so the overlay is not left holding finished views.
const BURST_LIFETIME_MS = 2000;

// What the context hands out: one function, which fires a burst.
type CelebrationContextValue = {
  celebrate: () => void;
};

// A no-op default rather than a thrown error. This is decoration, so a screen
// rendered without the provider, a unit test say, should lose the animation and
// nothing else. App.tsx mounts the real one.
const CelebrationContext = createContext<CelebrationContextValue>({
  celebrate: () => {},
});

// How a screen fires a burst.
export function useCelebration(): CelebrationContextValue {
  return useContext(CelebrationContext);
}

// Wraps the app, holds the current burst, and renders it above the children.
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  // Bumped per burst, then used as the overlay's key. Changing a key remounts
  // the component, which is what gives each burst fresh random positions.
  // Zero doubles as "nothing has fired yet", so nothing renders.
  const [burstId, setBurstId] = useState(0);

  const celebrate = useCallback(() => {
    setBurstId((current) => current + 1);
  }, []);

  // Memoised because a context value rebuilt on every render re-renders every
  // consumer, which here is every screen in the app.
  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {burstId > 0 && <ConfettiBurst key={burstId} />}
    </CelebrationContext.Provider>
  );
}

// One burst. Mounts a set of coloured pieces, animates them falling and
// drifting, then renders nothing once they are done.
function ConfettiBurst() {
  const { colors } = useTheme();
  const [done, setDone] = useState(false);

  // Each piece gets its own position, size, drift, spin and speed, so the burst
  // does not read as fourteen identical things falling in step.
  //
  // useState with a function initialiser, not a plain value: the function runs
  // on the first render only, so re-renders during the animation do not reroll
  // the randoms and teleport every particle.
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      anim: new Animated.Value(0),
      left: 8 + Math.random() * 84,
      size: 6 + Math.random() * 6,
      drift: Math.random() * 120 - 60,
      rotate: Math.random() * 360,
      colorKey: CELEBRATION_COLORS[index % CELEBRATION_COLORS.length] as
        (typeof CELEBRATION_COLORS)[number],
      round: Math.random() > 0.5,
      duration: 1100 + Math.random() * 500,
    }))
  );

  // Starts the fall, schedules the cleanup, and tears both down on unmount.
  React.useEffect(() => {
    // Animated.parallel drives all fourteen from one composite animation, so
    // they start and stop together rather than being tracked individually.
    // useNativeDriver hands the work to the UI thread, which keeps the burst
    // smooth while JavaScript is busy navigating back to Home.
    const composite = Animated.parallel(
      particles.map((particle) =>
        Animated.timing(particle.anim, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    );
    composite.start();

    // Drop the views once the burst is over, rather than leaving fourteen
    // finished Animated.Views alive on an overlay that never unmounts.
    const timer = setTimeout(() => setDone(true), BURST_LIFETIME_MS);

    // Without this, a burst interrupted mid-flight would keep running against
    // an unmounted tree.
    return () => {
      composite.stop();
      clearTimeout(timer);
    };
    // Empty deps: particles are created once and never replaced, so the burst
    // is set up a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID="celebration-layer">
      {/* Every particle is driven by one 0-to-1 value. interpolate maps that
          single number onto fall, drift, spin and fade at once, so the four
          stay in step with each other. */}
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            left: `${particle.left}%`,
            top: 90,
            width: particle.size,
            height: particle.size * 1.4,
            borderRadius: particle.round ? 999 : 2,
            backgroundColor: colors[particle.colorKey],
            opacity: particle.anim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateY: particle.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 460],
                }),
              },
              {
                translateX: particle.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, particle.drift],
                }),
              },
              {
                rotate: particle.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${particle.rotate + 360}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// The overlay covers the app and never takes a touch. Nothing here is
// interactive, and a layer that swallowed taps would make the whole screen
// dead for the length of the burst.
const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
});
