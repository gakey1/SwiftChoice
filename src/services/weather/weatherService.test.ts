// Tests for the rain forecast. The network is stubbed, so these check what is
// ours: that the right question is asked, that the threshold behaves at its
// edges, and above all that every failure reports "unavailable" rather than
// letting a wrong warning reach the user.

import { getRainForecast, RAIN_LIKELY_PERCENT } from "./weatherService";

function mockFetchOnce(body: unknown, ok = true) {
  const spy = jest.fn(async (_url: string) => ({ ok, json: async () => body }));
  (globalThis as unknown as { fetch: unknown }).fetch = spy;
  return spy;
}

const MELBOURNE = { latitude: -37.8136, longitude: 144.9631 };

describe("getRainForecast", () => {
  it("asks only for the next hour's chance of rain at the given point", () => {
    const spy = mockFetchOnce({ hourly: { precipitation_probability: [10] } });

    return getRainForecast(MELBOURNE).then(() => {
      const url = String(spy.mock.calls[0]?.[0]);
      expect(url).toContain("latitude=-37.8136");
      expect(url).toContain("longitude=144.9631");
      expect(url).toContain("hourly=precipitation_probability");
      // One hour only. Asking for a longer forecast would be data we never use.
      expect(url).toContain("forecast_hours=1");
    });
  });

  it("calls rain likely at the threshold and above", async () => {
    mockFetchOnce({ hourly: { precipitation_probability: [RAIN_LIKELY_PERCENT] } });
    await expect(getRainForecast(MELBOURNE)).resolves.toEqual({
      ok: true,
      rainLikely: true,
      probabilityPercent: RAIN_LIKELY_PERCENT,
    });

    mockFetchOnce({ hourly: { precipitation_probability: [95] } });
    await expect(getRainForecast(MELBOURNE)).resolves.toMatchObject({ rainLikely: true });
  });

  it("does not call rain likely below the threshold", async () => {
    // A warning on a merely cloudy day teaches people to ignore it.
    mockFetchOnce({ hourly: { precipitation_probability: [RAIN_LIKELY_PERCENT - 1] } });
    await expect(getRainForecast(MELBOURNE)).resolves.toMatchObject({ rainLikely: false });

    mockFetchOnce({ hourly: { precipitation_probability: [0] } });
    await expect(getRainForecast(MELBOURNE)).resolves.toMatchObject({ rainLikely: false });
  });

  it("reports unavailable when the service errors, rather than throwing", async () => {
    mockFetchOnce({}, false);
    await expect(getRainForecast(MELBOURNE)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports unavailable when the answer has no forecast in it", async () => {
    mockFetchOnce({ hourly: {} });
    await expect(getRainForecast(MELBOURNE)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports unavailable when the forecast value is not a number", async () => {
    mockFetchOnce({ hourly: { precipitation_probability: ["heavy"] } });
    await expect(getRainForecast(MELBOURNE)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports unavailable when the network throws, so no caller needs a catch", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(getRainForecast(MELBOURNE)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
