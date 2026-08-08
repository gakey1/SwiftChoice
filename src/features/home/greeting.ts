// The greeting at the top of Home.
//
// The Arcade mockup has "Good morning!" typed into it, because a static mockup
// is only ever screenshotted once. Shipping it literally means the app wishes
// somebody good morning at eleven at night, which is the sort of detail that
// makes software feel unattended.
//
// Kept as a pure function of the hour rather than reading the clock itself, so
// every boundary can be tested directly and no clock is read during render.

export type GreetingPeriod = "morning" | "afternoon" | "evening";

// Boundaries chosen to match ordinary use rather than anything astronomical:
// morning starts at 5, afternoon at 12, evening at 18, and everything from
// midnight to 5 is still "evening" because someone awake at 2am has not started
// a new day in any sense they would recognise.
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

const GREETINGS: Record<GreetingPeriod, string> = {
  morning: "Good morning!",
  afternoon: "Good afternoon!",
  evening: "Good evening!",
};

// The full line, greeting included, exactly as the design words it after the
// exclamation mark.
export function greetingFor(hour: number): string {
  return `${GREETINGS[greetingPeriod(hour)]} What decision can I help with today?`;
}
