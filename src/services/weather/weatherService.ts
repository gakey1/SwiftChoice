// What it is like outside right now, where the user is. Focus uses this to tell
// someone heading to an outdoor spot what to expect, so it asks for temperature
// and conditions as well as the chance of rain.

// Open-Meteo rather than a paid weather product: no key, no account, no card,
// so it adds no billing surface and keeps working even if the Google billing
// Fuel uses ever lapses (D-010). Asking for more fields costs nothing here,
// being the same endpoint and the same single request.
const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

// At or above this chance of rain, the umbrella advice is worth giving. Below it
// the advice would fire on most cloudy days and people would learn to ignore it.
export const RAIN_LIKELY_PERCENT = 50;

// A tagged result rather than an exception, matching locationService, so callers
// never need a try and catch and a failed lookup simply shows nothing.
export type OutdoorConditions =
  | {
      ok: true;
      temperatureC: number;
      // What the air feels like once wind and humidity are accounted for. This
      // is the number the advice is derived from.
      feelsLikeC: number;
      rainChancePercent: number;
      rainLikely: boolean;
      // WMO code describing the sky. Translated to a word by conditionLabel.
      weatherCode: number;
      windKph: number;
    }
  | { ok: false; reason: "unavailable" };

export type OutdoorConditionsParams = {
  latitude: number;
  longitude: number;
};

// Open-Meteo publishes the chance of rain in its hourly block only, not its
// current block, so the request asks for both: one hour of probability, and the
// present readings for everything else. Units are named explicitly rather than
// left to the service's defaults, because a default that changed upstream would
// turn a Celsius reading into a Fahrenheit one with nothing on our side failing.
function buildUrl(params: OutdoorConditionsParams): string {
  return (
    `${ENDPOINT}?latitude=${params.latitude}&longitude=${params.longitude}` +
    `&hourly=precipitation_probability&forecast_hours=1` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
  );
}

// Narrows an unknown field to a usable number. Open-Meteo answers with JSON we
// do not control, so every value is checked rather than trusted, and NaN is
// rejected because it survives a typeof check and then poisons any comparison
// it reaches.
function asNumber(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

// Looks up what it is like outside right now. Never throws: if the service is
// unreachable or answers with something unexpected, this reports that conditions
// are unavailable and the caller shows nothing, because a missing forecast must
// not turn into a wrong claim about the weather.
export async function getOutdoorConditions(
  params: OutdoorConditionsParams
): Promise<OutdoorConditions> {
  try {
    const response = await fetch(buildUrl(params));

    if (!response.ok) {
      return { ok: false, reason: "unavailable" };
    }

    const payload = (await response.json()) as {
      hourly?: { precipitation_probability?: unknown };
      current?: Record<string, unknown>;
    };

    const probabilities = payload.hourly?.precipitation_probability;
    const rainChancePercent = Array.isArray(probabilities) ? asNumber(probabilities[0]) : null;

    const current = payload.current ?? {};
    const temperatureC = asNumber(current["temperature_2m"]);
    const feelsLikeC = asNumber(current["apparent_temperature"]);
    const weatherCode = asNumber(current["weather_code"]);
    const windKph = asNumber(current["wind_speed_10m"]);

    // Everything is required. A partial answer is not a real mode for a single
    // endpoint, so one missing field means the request itself is wrong rather
    // than the weather being partly unknown, and half a reading on the card
    // would be worse than none.
    if (
      rainChancePercent === null ||
      temperatureC === null ||
      feelsLikeC === null ||
      weatherCode === null ||
      windKph === null
    ) {
      return { ok: false, reason: "unavailable" };
    }

    return {
      ok: true,
      temperatureC,
      feelsLikeC,
      rainChancePercent,
      rainLikely: rainChancePercent >= RAIN_LIKELY_PERCENT,
      weatherCode,
      windKph,
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
