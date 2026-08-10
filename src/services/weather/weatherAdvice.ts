// Turns a set of readings into the two lines the Focus card shows: what it is
// like, and what to do about it.
//
// Free of network and React, so every band below can be tested directly. These
// rules are the whole feature as far as a user is concerned.

// Type-only, so nothing here needs weatherService at runtime. That matters: the
// Focus screen test mocks weatherService, and a threshold imported from it would
// arrive undefined, turning every comparison below silently false.
import type { OutdoorConditions } from "./weatherService";

// The readings, once the caller has established they exist. Narrowing the
// success arm out of the union keeps these functions from having to handle a
// failure they can do nothing about.
export type Readings = Extract<OutdoorConditions, { ok: true }>;

// Advice thresholds, in degrees Celsius, measured against apparent temperature
// rather than the raw reading, because what a person needs to carry depends on
// what the air feels like and not what the thermometer says.
export const COLD_FEELS_LIKE_C = 12;
export const HOT_FEELS_LIKE_C = 30;

// Only worth naming the feels-like figure when it is far enough from the real
// one to tell someone something. "17 degrees, feels like 17" is noise.
const FEELS_LIKE_GAP_C = 2;

// WMO weather codes, grouped to the granularity a person actually needs. Codes
// with no entry return null and the card simply omits the word, on the same rule
// used everywhere else here: say nothing rather than something wrong.
const CONDITION_LABELS: ReadonlyMap<number, string> = new Map([
  [0, "Clear"],
  [1, "Mostly clear"],
  [2, "Partly cloudy"],
  [3, "Overcast"],
  [45, "Foggy"],
  [48, "Foggy"],
  [51, "Drizzle"],
  [53, "Drizzle"],
  [55, "Drizzle"],
  [56, "Freezing drizzle"],
  [57, "Freezing drizzle"],
  [61, "Rain"],
  [63, "Rain"],
  [65, "Heavy rain"],
  [66, "Freezing rain"],
  [67, "Freezing rain"],
  [71, "Snow"],
  [73, "Snow"],
  [75, "Heavy snow"],
  [77, "Snow"],
  [80, "Showers"],
  [81, "Showers"],
  [82, "Heavy showers"],
  [85, "Snow showers"],
  [86, "Snow showers"],
  [95, "Thunderstorms"],
  [96, "Thunderstorms"],
  [99, "Thunderstorms"],
]);

export function conditionLabel(weatherCode: number): string | null {
  return CONDITION_LABELS.get(weatherCode) ?? null;
}

// The figure line, for example "Partly cloudy, 17 degrees, feels like 14".
//
// Written as a word rather than a degree symbol deliberately: everything pushed
// to the repository is audited for non-ASCII characters, and the symbol would be
// the one place the app broke that on every Focus result.
export function conditionsSummary(readings: Readings): string {
  const temperature = Math.round(readings.temperatureC);
  const feelsLike = Math.round(readings.feelsLikeC);

  const parts: string[] = [];

  const label = conditionLabel(readings.weatherCode);
  if (label !== null) {
    parts.push(label);
  }

  parts.push(`${temperature} degrees`);

  if (Math.abs(feelsLike - temperature) >= FEELS_LIKE_GAP_C) {
    parts.push(`feels like ${feelsLike}`);
  }

  return parts.join(", ");
}

// Whether the spot is outside, which decides both of the rules below.
export type SpotSetting = "outdoor" | "indoor";

// Whether the strip is worth showing at all.
//
// Outdoor is always worth it: the answer changes whether you go. Indoor is worth
// it only when there is something to carry, because you still have to get there.
// A fine day on the way to a library is not news.
export function shouldShowConditions(readings: Readings, setting: SpotSetting): boolean {
  if (setting === "outdoor") {
    return true;
  }

  return readings.rainLikely || readings.feelsLikeC <= COLD_FEELS_LIKE_C;
}

// The advice line. Rain outranks temperature because it is the one that changes
// whether the spot is usable at all, but cold and rain together get a combined
// sentence, since a jacket and an umbrella are two different things to carry and
// naming only one of them would be the less useful half.
export function conditionsAdvice(readings: Readings, setting: SpotSetting): string {
  const cold = readings.feelsLikeC <= COLD_FEELS_LIKE_C;
  const hot = readings.feelsLikeC >= HOT_FEELS_LIKE_C;

  // Indoors the weather is about the journey, not the desk, so the wording says
  // so. Suggesting an indoor spot instead would be absurd here.
  if (setting === "indoor") {
    if (readings.rainLikely && cold) {
      return "Cold and rain likely. Take a jacket and an umbrella on the way.";
    }

    if (readings.rainLikely) {
      return "Rain likely in the next hour. Take an umbrella on the way there.";
    }

    return "Cold on the way. Take a jacket.";
  }

  if (readings.rainLikely && cold) {
    return "Cold and rain likely. Take a jacket and an umbrella.";
  }

  if (readings.rainLikely) {
    return "Rain likely in the next hour. Take an umbrella, or pick an indoor spot.";
  }

  if (cold) {
    return "Cold out there. Take a jacket.";
  }

  if (hot) {
    return "Hot out there. Take water and find some shade.";
  }

  return "Good conditions for working outside.";
}
