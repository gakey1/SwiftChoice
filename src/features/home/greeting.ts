// The greeting at the top of Home. The mockup has "Good morning!" typed into
// it, which shipped literally would greet somebody at eleven at night.

// The three parts of the day the greeting distinguishes.
export type GreetingPeriod = "morning" | "afternoon" | "evening";

// A pure function of the hour rather than something that reads the clock, so
// every boundary is directly testable and no clock is read during render.
// Midnight to 5 falls through to "evening": someone awake at 2am has not
// started a new day in any sense they would recognise.
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

// The words for each period. Keyed by GreetingPeriod, so adding a period
// without wording is a compile error rather than an empty greeting.
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
