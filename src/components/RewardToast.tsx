// The short pill that rises, holds, and fades after an action worth
// acknowledging. The design uses it for a reroll; the Priority screen has its
// own older copy of the same idea.
//
// The timings come straight from the design's toastRise keyframes rather than
// being invented: 1150ms end to end, with a slight overshoot on the way in so it
// arrives with a bit of life instead of sliding flatly into place.
//
//   0%    6px below, 90 percent size, invisible
//   18%   in place, 105 percent size, fully visible
//   78%   10px above, back to full size
//   100%  26px above, 96 percent size, gone
//
// Nothing here is interactive and it must never intercept a tap, so it is
// pointerEvents="none" and sits above the card it belongs to.

import { useCallback, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

import { T } from "@/theme/tokens";

const TOTAL_MS = 1150;

export function useRewardToast() {
  // Held in state with a lazy initialiser rather than a ref, matching how the
  // Priority screen does it. Reading a ref during render is what the hooks lint
  // rule objects to, and the value only ever needs creating once either way.
  const [progress] = useState(() => new Animated.Value(0));
  const [text, setText] = useState("");

  const show = useCallback(
    (message: string) => {
      setText(message);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: TOTAL_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Only clear on a natural finish. A run cut short by the screen going
        // away has nothing left to clear, and clearing on it would wipe the
        // text out from under a toast that is still on screen.
        if (finished) setText("");
      });
    },
    [progress]
  );

  // A toast still running when the screen unmounts would otherwise keep an
  // animation alive against a component that is gone.
  useEffect(() => {
    return () => {
      progress.stopAnimation();
    };
  }, [progress]);

  return { toastText: text, toastProgress: progress, showToast: show };
}

type RewardToastProps = {
  text: string;
  progress: Animated.Value;
  // The pill fill. Passed in rather than read from the theme so each module can
  // use its own colour and the module-colour rule stays with the caller.
  color: string;
  textColor: string;
};

export function RewardToast({ text, progress, color, textColor }: RewardToastProps) {
  if (text === "") {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          backgroundColor: color,
          opacity: progress.interpolate({
            inputRange: [0, 0.18, 0.78, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.18, 0.78, 1],
                outputRange: [6, 0, -10, -26],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.18, 0.78, 1],
                outputRange: [0.9, 1.05, 1, 0.96],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    top: "28%",
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 41,
  },
  text: { fontFamily: T.font.bold, fontSize: 14 },
});
