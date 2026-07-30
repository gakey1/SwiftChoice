// Answers one question for the Focus module: is rain likely in the next hour
// where the user is. That is all the outdoor-spot warning needs, so this asks
// for nothing more.
//
// Open-Meteo is used rather than a paid weather product because it needs no key,
// no account and no card, so it adds no billing surface and keeps working even
// if the Google billing used by Fuel ever lapses. See decision D-010.

// Open-Meteo is free for this kind of use and needs no key.
const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

// At or above this chance of rain, the spot warning is worth showing. Below it
// the warning would fire on most cloudy days and people would learn to ignore it.
export const RAIN_LIKELY_PERCENT = 50;

// A tagged result rather than an exception, matching locationService, so callers
// never need a try and catch and a failed forecast simply shows no warning.
export type RainForecast =
  | { ok: true; rainLikely: boolean; probabilityPercent: number }
  | { ok: false; reason: "unavailable" };

export type RainForecastParams = {
  latitude: number;
  longitude: number;
};

// Looks up the chance of rain in the coming hour. Never throws: if the service
// is unreachable or answers with something unexpected, this reports that the
// forecast is unavailable and the caller shows nothing, because a missing
// forecast must not turn into a wrong warning.
export async function getRainForecast(params: RainForecastParams): Promise<RainForecast> {
  try {
    const url =
      `${ENDPOINT}?latitude=${params.latitude}&longitude=${params.longitude}` +
      `&hourly=precipitation_probability&forecast_hours=1&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      return { ok: false, reason: "unavailable" };
    }

    const payload: unknown = await response.json();
    const probabilities = (payload as { hourly?: { precipitation_probability?: unknown } })
      .hourly?.precipitation_probability;

    if (!Array.isArray(probabilities)) {
      return { ok: false, reason: "unavailable" };
    }

    const next = probabilities[0];

    if (typeof next !== "number" || Number.isNaN(next)) {
      return { ok: false, reason: "unavailable" };
    }

    return {
      ok: true,
      rainLikely: next >= RAIN_LIKELY_PERCENT,
      probabilityPercent: next,
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
