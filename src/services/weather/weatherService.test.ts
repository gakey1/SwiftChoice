// Tests for the outdoor conditions lookup. The network is stubbed, so these
// check what is ours: that the right question is asked, that units are pinned,
// that the rain threshold behaves at its edges, and above all that every failure
// reports "unavailable" rather than letting a wrong claim reach the user.

// The function under test, plus the threshold its rainLikely flag is derived
// from, imported rather than typed in again.
import { getOutdoorConditions, RAIN_LIKELY_PERCENT } from "./weatherService";

// A complete "current" block, which every case starts from and then breaks in
// one specific way.
const CURRENT = {
  temperature_2m: 17.4,
  apparent_temperature: 15.1,
  weather_code: 2,
  wind_speed_10m: 12,
};

// A full Open-Meteo response, with either half replaced by a case.
function payload(overrides: { hourly?: unknown; current?: unknown } = {}) {
  return {
    hourly: { precipitation_probability: [10] },
    current: CURRENT,
    ...overrides,
  };
}

function mockFetchOnce(body: unknown, ok = true) {
  const spy = jest.fn(async (_url: string) => ({ ok, json: async () => body }));
  (globalThis as unknown as { fetch: unknown }).fetch = spy;
  return spy;
}

const MELBOURNE = { latitude: -37.8136, longitude: 144.9631 };

describe("getOutdoorConditions", () => {
  it("asks one request for the present readings and the next hour's chance of rain", async () => {
    const spy = mockFetchOnce(payload());

    await getOutdoorConditions(MELBOURNE);

    // One call, not two. The two blocks come back together, and splitting them
    // would double the requests for no extra information.
    expect(spy).toHaveBeenCalledTimes(1);

    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain("latitude=-37.8136");
    expect(url).toContain("longitude=144.9631");
    // Probability is published hourly, not as a current reading, so both blocks
    // are needed to answer the whole question.
    expect(url).toContain("hourly=precipitation_probability");
    expect(url).toContain("current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    // One hour only. Asking for a longer forecast would be data we never use.
    expect(url).toContain("forecast_hours=1");
  });

  it("pins the units, so an upstream default cannot silently change them", async () => {
    const spy = mockFetchOnce(payload());

    await getOutdoorConditions(MELBOURNE);

    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain("temperature_unit=celsius");
    expect(url).toContain("wind_speed_unit=kmh");
  });

  it("returns every reading, rounded by the caller rather than here", async () => {
    mockFetchOnce(payload());

    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: true,
      temperatureC: 17.4,
      feelsLikeC: 15.1,
      rainChancePercent: 10,
      rainLikely: false,
      weatherCode: 2,
      windKph: 12,
    });
  });

  it("calls rain likely at the threshold and above", async () => {
    mockFetchOnce(payload({ hourly: { precipitation_probability: [RAIN_LIKELY_PERCENT] } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toMatchObject({
      rainLikely: true,
      rainChancePercent: RAIN_LIKELY_PERCENT,
    });

    mockFetchOnce(payload({ hourly: { precipitation_probability: [95] } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toMatchObject({ rainLikely: true });
  });

  it("does not call rain likely below the threshold", async () => {
    // Advice on a merely cloudy day teaches people to ignore it.
    mockFetchOnce(payload({ hourly: { precipitation_probability: [RAIN_LIKELY_PERCENT - 1] } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toMatchObject({ rainLikely: false });

    mockFetchOnce(payload({ hourly: { precipitation_probability: [0] } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toMatchObject({ rainLikely: false });
  });

  it("reports unavailable when the service errors, rather than throwing", async () => {
    mockFetchOnce({}, false);
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unavailable when the answer has no rain forecast in it", async () => {
    mockFetchOnce(payload({ hourly: {} }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unavailable when a current reading is missing", async () => {
    // Half a reading on the card would be worse than none, so a partial answer
    // is treated as no answer.
    mockFetchOnce(payload({ current: { temperature_2m: 17.4, weather_code: 2, wind_speed_10m: 12 } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unavailable when the current block is absent entirely", async () => {
    mockFetchOnce({ hourly: { precipitation_probability: [10] } });
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unavailable when a value is not a number", async () => {
    mockFetchOnce(payload({ hourly: { precipitation_probability: ["heavy"] } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("rejects NaN, which survives a typeof check and then poisons comparisons", async () => {
    mockFetchOnce(payload({ current: { ...CURRENT, apparent_temperature: NaN } }));
    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unavailable when the network throws, so no caller needs a catch", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(getOutdoorConditions(MELBOURNE)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
