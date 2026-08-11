// Stamps when the user opened a module, which is the start of a decision. The
// gap between this and accepting is the Avg. decide figure on Home.

// Holds the stamp for the life of the screen.
import { useState } from "react";

// A reroll deliberately does not reset the clock, because rerolling is part of
// the same decision. The useState initialiser runs on first render only, so
// every later render sees the same stamp.
export function useDecisionStart(): string {
  const [startedAt] = useState(() => new Date().toISOString());
  return startedAt;
}
