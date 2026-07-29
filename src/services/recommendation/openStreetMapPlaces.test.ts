// Tests for the OpenStreetMap Overpass client. globalThis.fetch is mocked so these
// run offline: they check that the query goes out with a User-Agent, that named
// eat-out places come back nearest-first with a real distance, that unusable
// elements are dropped, that the limit is honoured, and that a failed request
// throws for the caller to handle.

import { fetchNearbyPlaces, OSM_ATTRIBUTION } from "./openStreetMapPlaces";

// Melbourne CBD, the point we query around in these tests.
const LAT = -37.8136;
const LNG = 144.9631;

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as typeof fetch;
}

describe("fetchNearbyPlaces", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns named eat-out places nearest first with a distance", async () => {
    mockFetchOnce({
      elements: [
        // Farther away (~1.5km south).
        { type: "node", id: 2, lat: -37.827, lon: 144.963, tags: { name: "Far Cafe", amenity: "cafe" } },
        // Very close, as a way with a centre and a cuisine tag.
        {
          type: "way",
          id: 1,
          center: { lat: -37.8138, lon: 144.9633 },
          tags: { name: "Near Bistro", amenity: "restaurant", cuisine: "italian" },
        },
      ],
    });

    const places = await fetchNearbyPlaces({ latitude: LAT, longitude: LNG, radiusMeters: 2000 });

    expect(places).toHaveLength(2);
    // Nearest first: the bistro a few metres away leads the far cafe.
    expect(places[0]?.name).toBe("Near Bistro");
    expect(places[1]?.name).toBe("Far Cafe");
    expect(places[0]?.cuisine).toBe("italian");
    expect(places[1]?.cuisine).toBeNull();
    expect(places[0]?.category).toBe("restaurant");
    // A real, positive distance was computed and the far one is farther.
    expect(places[0]?.distanceMeters).toBeGreaterThan(0);
    expect(places[1]?.distanceMeters).toBeGreaterThan(places[0]!.distanceMeters);
  });

  it("drops elements with no name, no amenity, or no coordinates", async () => {
    mockFetchOnce({
      elements: [
        { type: "node", id: 1, lat: -37.8137, lon: 144.9632, tags: { name: "Good Place", amenity: "cafe" } },
        { type: "node", id: 2, lat: -37.8137, lon: 144.9632, tags: { amenity: "restaurant" } }, // no name
        { type: "node", id: 3, lat: -37.8137, lon: 144.9632, tags: { name: "Not Food", amenity: "bank" } }, // not eat-out
        { type: "relation", id: 4, tags: { name: "No Coords", amenity: "restaurant" } }, // no position
      ],
    });

    const places = await fetchNearbyPlaces({ latitude: LAT, longitude: LNG, radiusMeters: 2000 });

    expect(places.map((p) => p.name)).toEqual(["Good Place"]);
  });

  it("honours the limit, keeping the nearest", async () => {
    mockFetchOnce({
      elements: [
        { type: "node", id: 1, lat: -37.9, lon: 145.0, tags: { name: "Third", amenity: "cafe" } },
        { type: "node", id: 2, lat: -37.8138, lon: 144.9633, tags: { name: "First", amenity: "cafe" } },
        { type: "node", id: 3, lat: -37.83, lon: 144.965, tags: { name: "Second", amenity: "cafe" } },
      ],
    });

    const places = await fetchNearbyPlaces({ latitude: LAT, longitude: LNG, radiusMeters: 50000, limit: 2 });

    expect(places.map((p) => p.name)).toEqual(["First", "Second"]);
  });

  it("sends the query with a User-Agent header", async () => {
    mockFetchOnce({ elements: [] });

    await fetchNearbyPlaces({ latitude: LAT, longitude: LNG, radiusMeters: 1000 });

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["User-Agent"]).toContain("SwiftChoice");
    expect(init.body).toContain("restaurant");
  });

  it("throws when the request fails", async () => {
    mockFetchOnce({}, false, 504);

    await expect(
      fetchNearbyPlaces({ latitude: LAT, longitude: LNG, radiusMeters: 1000 })
    ).rejects.toThrow(/504/);
  });

  it("exports the OSM attribution string", () => {
    expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
  });
});
