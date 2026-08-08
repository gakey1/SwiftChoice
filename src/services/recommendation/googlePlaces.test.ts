// Tests for the Google Places client. The network is stubbed, so these check
// the parts that are ours: that the request is shaped the way Google expects,
// that the field list stays inside the tier we chose, and that real responses
// with missing fields do not break anything.

import type { GooglePlaceResult } from "./googlePlaces";
import {
  fetchAreaCoordinates,
  fetchAreaSuggestions,
  fetchNearbyPlaces,
  fetchPlacesByArea,
  GOOGLE_ATTRIBUTION,
  MissingPlacesKeyError,
  readableAddress,
} from "./googlePlaces";

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

  it("asks for no field beyond the six we costed", async () => {
    // Adding a field here can move every call into a dearer tier with a smaller
    // free allowance, so this is a cost guard, not a formatting check.
    //
    // The two address fields were added 2026-08-08 after checking the tiers.
    // Google bills a request once, at the highest tier any requested field
    // belongs to. rating and priceLevel are Enterprise and were already here, so
    // the Pro-tier addresses changed nothing. Adding an Enterprise field is the
    // change that would cost money.
    const spy = mockFetchOnce({ places: [] });

    await fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 });

    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const mask = (init.headers as Record<string, string>)["X-Goog-FieldMask"];
    expect(mask?.split(",").sort()).toEqual([
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.priceLevel",
      "places.rating",
      "places.shortFormattedAddress",
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

  it("throws a distinguishable type when the key is missing", async () => {
    // The type is what lets the engine tell "nobody set this up" apart from
    // "the call failed", so the screen can name the real cause instead of
    // sending the reader to check their filters for a fault that is not there.
    delete process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
    mockFetchOnce({ places: [] });

    await expect(
      fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 })
    ).rejects.toBeInstanceOf(MissingPlacesKeyError);
  });

  it("does not raise the missing-key type when a real call fails", async () => {
    // Guards the other half. If a network failure were also reported as a
    // missing key, the screen would tell everyone to edit a .env file that is
    // already correct.
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    mockFetchOnce({ error: "boom" }, false, 500);

    await expect(
      fetchNearbyPlaces({ latitude: 0, longitude: 0, radiusMeters: 500 })
    ).rejects.not.toBeInstanceOf(MissingPlacesKeyError);
  });

  it("keeps a typed-area search inside Australia", async () => {
    // A bare suburb name is otherwise a worldwide search. Plenty of Australian
    // suburb names also exist in Britain and the United States, so without this
    // somebody typing their own suburb can be shown results overseas with
    // nothing on screen suggesting anything went wrong.
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    const spy = mockFetchOnce({ places: [] });

    await fetchPlacesByArea("Belgrave");

    const body = JSON.parse((spy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.regionCode).toBe("AU");
    expect(body.textQuery).toContain("Belgrave");
  });

  it("asks for areas only, inside Australia, under one session token", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    const spy = mockFetchOnce({ suggestions: [] });

    await fetchAreaSuggestions("Belg", "token-1");

    const body = JSON.parse((spy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.input).toBe("Belg");
    // Without this the list fills with cafes and shops rather than places a
    // person could be standing in.
    expect(body.includedPrimaryTypes).toEqual(["(regions)"]);
    expect(body.includedRegionCodes).toEqual(["AU"]);
    // The token is what keeps these keystrokes free. Dropping it bills each one
    // separately, which is a cost bug that nothing on screen would reveal.
    expect(body.sessionToken).toBe("token-1");
  });

  it("drops suggestions with no place behind them", async () => {
    // Google mixes in query predictions, which are search phrases rather than
    // places. They have no id to resolve, so offering one would give the user a
    // row that does nothing when tapped.
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    mockFetchOnce({
      suggestions: [
        { placePrediction: { placeId: "abc", text: { text: "Belgrave VIC 3160" } } },
        { queryPrediction: { text: { text: "belgrave restaurants" } } },
      ],
    });

    const results = await fetchAreaSuggestions("Belg", "token-1");

    expect(results).toEqual([{ placeId: "abc", label: "Belgrave VIC 3160" }]);
  });

  it("resolves a chosen area to coordinates, asking for location only", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    const spy = mockFetchOnce({ location: { latitude: -37.9, longitude: 145.35 } });

    const result = await fetchAreaCoordinates("abc", "token-1");

    expect(result).toEqual({ latitude: -37.9, longitude: 145.35 });

    const [url, init] = spy.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    // The session token has to reach this call, because it is what makes the
    // typing that led here free rather than billed per keystroke.
    expect(url).toContain("sessionToken=token-1");
    // Place Details is billed by the fields asked for. Anything beyond location
    // moves every one of these calls into a dearer tier.
    expect(init.headers["X-Goog-FieldMask"]).toBe("location");
  });

  it("throws rather than returning a half-answer when details have no location", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY = "test-key";
    mockFetchOnce({});

    await expect(fetchAreaCoordinates("abc", "token-1")).rejects.toThrow("no location");
  });

  it("exports the credit line Google requires on screen", () => {
    expect(GOOGLE_ATTRIBUTION).toBe("Powered by Google");
  });
});

// The street address, added on Tracy's suggestion 2026-08-08.
describe("readableAddress", () => {
  function place(fields: Partial<GooglePlaceResult>): GooglePlaceResult {
    return { displayName: { text: "Somewhere" }, ...fields };
  }

  it("prefers the short address, which is the one that fits a card", () => {
    expect(
      readableAddress(
        place({
          shortFormattedAddress: "120 Swanston St, Melbourne",
          formattedAddress: "120 Swanston St, Melbourne VIC 3000, Australia",
        })
      )
    ).toBe("120 Swanston St, Melbourne");
  });

  it("falls back to the long address when Google omits the short one", () => {
    expect(
      readableAddress(place({ formattedAddress: "120 Swanston St, Melbourne VIC 3000, Australia" }))
    ).toBe("120 Swanston St, Melbourne VIC 3000, Australia");
  });

  it("returns undefined when Google holds neither", () => {
    // The card then shows nothing. A placeholder like "Address unavailable"
    // takes the same space as a real address and tells you less than silence.
    expect(readableAddress(place({}))).toBeUndefined();
  });

  it("treats a blank address as missing", () => {
    // An empty string is truthy enough to render, and would put an empty row
    // with a map pin on the card.
    expect(readableAddress(place({ shortFormattedAddress: "   ", formattedAddress: "" }))).toBeUndefined();
  });
});
