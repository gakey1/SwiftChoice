// The short pill that rises, holds, and fades after an action worth
// acknowledging, such as a reroll. It ignores touches, so it can sit above the
// card without eating taps. The hook drives it; the component draws it.

// Holds the animation value and the text, and stops the run on unmount.
import { useCallback, useEffect, useState } from "react";
// The animation driver, its easing curves, and the pill itself.
import { Animated, Easing, StyleSheet, Text } from "react-native";

// Design tokens: fonts.
import { T } from "@/theme/tokens";

// Rise, hold and fade, start to finish.
const TOTAL_MS = 1150;

// Owns one toast for a screen. Returns the text, the animation value, and the
// function that fires it, which the screen passes straight to RewardToast.
export function useRewardToast() {
  // Held in state with a lazy initialiser rather than a ref, matching how the
  // Priority screen does it. Reading a ref during render is what the hooks lint
  // rule objects to, and the value only ever needs creating once either way.
  const [progress] = useState(() => new Animated.Value(0));
  const [text, setText] = useState("");

  // Sets the message and restarts the animation from zero, so a second toast
  // fired mid-flight replaces the first rather than queueing behind it.
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

// The text and the animation value both come from useRewardToast; the two
// colours come from the caller.
type RewardToastProps = {
  text: string;
  progress: Animated.Value;
  // The pill fill. Passed in rather than read from the theme so each module can
  // use its own colour and the module-colour rule stays with the caller.
  color: string;
  textColor: string;
};

// Draws the pill, or nothing when there is no message to show.
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
          // Opacity, lift and scale share one 0-to-1 value and one set of stops,
          // taken from the design's toastRise keyframes:
          //
          //   0     6px below, 90 percent size, invisible
          //   0.18  in place, 105 percent size, fully visible (a slight
          //         overshoot, so it arrives with some life)
          //   0.78  10px above, back to full size
          //   1     26px above, 96 percent size, gone
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

// The pill floats centred over the screen, with a shadow and a high zIndex so
// it reads as sitting above the card. Its fill and text colour are set above.
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
