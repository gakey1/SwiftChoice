// The confetti burst that acknowledges a decision, and the one place that owns
// it for the whole app.
//
// Why this is app-level rather than per screen. The design keeps its confetti
// in a single layer pinned over the whole phone frame, outside any screen, and
// leaves the particles alive for about two seconds. That is not an arbitrary
// choice: accepting a decision navigates straight back to Home, so a burst
// belonging to the Fuel or Focus screen would be unmounted in the same frame it
// started and nobody would ever see it. Priority got away with a local copy
// only because completing a task leaves you on Priority.
//
// So the burst lives above the navigator and screens ask for one through
// useCelebration(). A screen can then celebrate and navigate away in the same
// handler, which is exactly what Accept does.
//
// Built from plain Views and the Animated API, no extra dependency, the same as
// the copy this replaces.

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

// Particles are tinted with the module colours plus teal. Teal is the only
// colour allowed anywhere, and a burst is not owned by one module: the same
// overlay fires for Fuel, Focus and Priority, so scoping it to a single
// module's colour would break the module-colour rule the moment it was reused.
const CELEBRATION_COLORS = ["priority", "teal", "fuel", "focus"] as const;

const PARTICLE_COUNT = 14;

// How long the slowest particle can take, plus a margin. Used to clear the
// burst so the overlay is not left holding finished views.
const BURST_LIFETIME_MS = 2000;

type CelebrationContextValue = {
  celebrate: () => void;
};

// The default is a working no-op rather than a thrown error. A missing provider
// should cost the animation and nothing else: this is decoration, and a screen
// that renders without it (a unit test, for one) must still work. The provider
// is mounted once in App.tsx, so in the app there is always a real one.
const CelebrationContext = createContext<CelebrationContextValue>({
  celebrate: () => {},
});

export function useCelebration(): CelebrationContextValue {
  return useContext(CelebrationContext);
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  // Bumped per burst. Used as the overlay's key so each burst gets a fresh set
  // of particles with fresh random positions, and as the "is anything running"
  // flag: zero means nothing has fired yet and nothing is rendered.
  const [burstId, setBurstId] = useState(0);

  const celebrate = useCallback(() => {
    setBurstId((current) => current + 1);
  }, []);

  // Memoised so every screen reading the context does not re-render each time
  // some unrelated state here changes.
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

  React.useEffect(() => {
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

    // Drop the views once the burst is over. Without this the overlay keeps
    // fourteen invisible Animated.Views alive until the next burst replaces
    // them, which costs nothing visible but is untidy on a screen that never
    // unmounts.
    const timer = setTimeout(() => setDone(true), BURST_LIFETIME_MS);

    return () => {
      composite.stop();
      clearTimeout(timer);
    };
    // Particles are created once and never replaced, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID="celebration-layer">
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

const styles = StyleSheet.create({
  // Covers the app and never takes a touch. Nothing here is interactive, and a
  // layer that swallowed taps would make the whole screen dead for the length
  // of the burst.
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
});
