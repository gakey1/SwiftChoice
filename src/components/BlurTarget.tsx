// Shares the view that Android blurs, between the screen background and the
// glass cards sitting on top of it.
//
// Why this exists. On iOS a BlurView blurs whatever happens to be behind it and
// needs no help. Android cannot do that: since expo-blur 56 a BlurView must be
// handed a `blurTarget`, a ref to a BlurTargetView wrapping the content to
// blur, and without one it quietly falls back to no blur at all. That fallback
// is why the frosted look never appeared on Android, and because it is silent
// on iOS nobody noticed for weeks.
//
// The awkward part is that the two ends are far apart in the tree.
// AmbientBackground owns the wash being blurred, GlassCard sits inside the
// screen content as its sibling's descendant, and neither is an ancestor of the
// other. A plain ref cannot cross that gap, because writing to a ref does not
// re-render anyone reading it: the cards would read null on first paint and
// never hear that the background had arrived. So the node is held in state
// here, and setting it re-renders the cards with a target to point at.
//
// One background is mounted at a time, since one screen is visible at a time,
// so a single shared slot is enough.

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { View } from "react-native";

type BlurTargetValue = {
  // Shaped as a ref object because that is what BlurView's blurTarget prop
  // takes, even though the value behind it is state.
  target: RefObject<View | null> | null;
  register: (node: View | null) => void;
};

const BlurTargetContext = createContext<BlurTargetValue>({
  target: null,
  register: () => {},
});

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<View | null>(null);

  const value = useMemo<BlurTargetValue>(
    () => ({ target: node ? { current: node } : null, register: setNode }),
    [node]
  );

  return <BlurTargetContext.Provider value={value}>{children}</BlurTargetContext.Provider>;
}

// For the background: hands its BlurTargetView node up so cards can blur it.
export function useRegisterBlurTarget() {
  return useContext(BlurTargetContext).register;
}

// For anything blurring the screen background. Null means there is no
// background mounted, or the app is on iOS where the prop is unused. Callers
// must omit the prop rather than pass null, which is why this returns null
// rather than a ref holding null.
export function useBlurTarget() {
  return useContext(BlurTargetContext).target;
}
