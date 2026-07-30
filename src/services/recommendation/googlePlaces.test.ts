// Tests for the Google Places client. The network is stubbed, so these check
// the parts that are ours: that the request is shaped the way Google expects,
// that the field list stays inside the tier we chose, and that real responses
// with missing fields do not break anything.

import { fetchNearbyPlaces, GOOGLE_ATTRIBUTION } from "./googlePlaces";

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const spy = jest.fn(async () => ({
    ok,
    status,
    json: async () => body,
  }));
  (globalThis as unknown as { fetch: unknown }).fetch = spy;
  return spy;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
});

afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = ORIGINAL_KEY;
});

describe("fetchNearbyPlaces", () => {
  it("sends the key, the field list and the search circle Google expects", async () => {
    const spy = mockFetchOnce({ places: [] });

    await fetchNearbyPlaces({ latitude: -37.8, longitude: 144.9, radiusMeters: 1000 });

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");

    const body = JSON.parse(init.body as string);
    expect(body.locationRestriction.circle.center).toEqual({
      latitude: -37.8,
      longitude: 144.9,
    });
    expect(body.locationRestriction.circle.radius).toBe(1000);
  });

  it("asks for no field beyond the four we costed", async () => {
    // Adding a field here can move every call into a dearer tier with a smaller
    // free allowance, so this is a cost guard, not a formatting check.
    const spy = mockFetchOnce({ places: [] });

    await fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 });

    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const mask = (init.headers as Record<string, string>)["X-Goog-FieldMask"];
    expect(mask?.split(",").sort()).toEqual([
      "places.displayName",
      "places.location",
      "places.priceLevel",
      "places.rating",
    ]);
  });

  it("never asks for more than the 20 places Google allows", async () => {
    const spy = mockFetchOnce({ places: [] });

    await fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500, limit: 100 });

    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).maxResultCount).toBe(20);
  });

  it("returns places that are missing a rating or a price", async () => {
    // Real records often carry neither. The mock this replaced always had both,
    // which is exactly the assumption that would have broken in production.
    mockFetchOnce({
      places: [
        { displayName: { text: "No Rating Cafe" } },
        { displayName: { text: "Full Record" }, rating: 4.4, priceLevel: "PRICE_LEVEL_MODERATE" },
      ],
    });

    const places = await fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 });

    expect(places).toHaveLength(2);
    expect(places[0]?.rating).toBeUndefined();
    expect(places[1]?.rating).toBe(4.4);
  });

  it("drops records with no usable name", async () => {
    mockFetchOnce({ places: [{ rating: 5 }, { displayName: { text: "Real Place" } }] });

    const places = await fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 });

    expect(places).toHaveLength(1);
    expect(places[0]?.displayName.text).toBe("Real Place");
  });

  it("treats a response with no places array as an empty result", async () => {
    mockFetchOnce({});

    await expect(
      fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 })
    ).resolves.toEqual([]);
  });

  it("throws when Google rejects the request, so the engine shows the empty state", async () => {
    mockFetchOnce({ error: "denied" }, false, 403);

    await expect(
      fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 })
    ).rejects.toThrow("403");
  });

  it("throws a clear message when the key is missing", async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
    mockFetchOnce({ places: [] });

    await expect(
      fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 })
    ).rejects.toThrow("EXPO_PUBLIC_GOOGLE_PLACES_KEY");
  });

  it("exports the credit line Google requires on screen", () => {
    expect(GOOGLE_ATTRIBUTION).toBe("Powered by Google");
  });
});
