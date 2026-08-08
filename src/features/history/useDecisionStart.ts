// When the user opened a module, which is the start of a decision.
//
// The gap between this and the moment they accept is how long the decision took,
// and it is the only timing figure the app reports (the Avg. decide column on
// Home). Recorded at the module screen's first render, because that is when the
// person actually started deciding.
//
// Deliberately not reset by a reroll. Rerolling is part of the same decision,
// not the start of a new one, so restarting the clock would report a decision
// that took three rerolls as though it were the quick one at the end.
//
// useState with an initialiser rather than a ref, so the value is computed once
// and the clock is never read again on later renders.

import { useState } from "react";

export function useDecisionStart(): string {
  const [startedAt] = useState(() => new Date().toISOString());
  return startedAt;
}
