// Live nearby-place discovery via the OpenStreetMap Overpass API. This is the
// real, cardless replacement for the Google Places mock (see D-009): given a
// position and a radius, it asks Overpass for restaurants, cafes and fast-food
// nearby and returns them nearest-first.
//
// OpenStreetMap has no ratings and no price, and we deliberately do NOT invent
// either (that would break the app's transparency principle). This module
// returns only what OSM actually knows - name, position, distance, and the raw
// cuisine tag - so a fabricated rating can never leak in downstream. The budget
// meaning is supplied separately as honest labelled bands, not per-place price.
//
// OSM's usage policy asks callers to identify themselves with a User-Agent and
// to show attribution, so we send one and export OSM_ATTRIBUTION for the UI.

// Shown on any screen that displays OpenStreetMap results, per the OSM licence.
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

// The public Overpass endpoint. Free, no key, no account.
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

// Identifies the app to Overpass, as the usage policy requests.
const USER_AGENT = "SwiftChoice/0.1 (student project; contact via app)";

// The amenity kinds we treat as "somewhere to eat out".
const EAT_OUT_AMENITIES = ["restaurant", "cafe", "fast_food"] as const;
export type PlaceCategory = (typeof EAT_OUT_AMENITIES)[number];

// A place exactly as OSM knows it, with the distance we computed. No rating and
// no price, on purpose.
export type NearbyPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  // Raw OSM cuisine tag (for example "thai" or "coffee_shop;cafe"), or null when
  // the place is not tagged with one. Used later only as a labelled guide.
  cuisine: string | null;
  category: PlaceCategory;
};

export type NearbyPlacesParams = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  // Cap on how many places to return, nearest first. Defaults to 20.
  limit?: number;
};

// The raw element shape Overpass returns. Nodes carry lat/lon directly; ways and
// relations carry a computed centre because we ask for "out center".
type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };

// Builds the Overpass QL query: eat-out amenities within `radius` metres of the
// point, as both nodes and ways, returning the ways' centre point.
function buildQuery(latitude: number, longitude: number, radiusMeters: number): string {
  const kinds = EAT_OUT_AMENITIES.join("|");
  const filter = `["amenity"~"^(${kinds})$"](around:${radiusMeters},${latitude},${longitude})`;
  return `[out:json][timeout:25];(node${filter};way${filter};);out center 60;`;
}

// Great-circle distance between two lat/lng points, in metres (haversine). Used
// to sort results by how near they are and to show a real distance.
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Pulls a node's or way's coordinates out of an element, or null if neither is
// present (a relation with no centre, say), so it can be skipped.
function coordsOf(element: OverpassElement): { lat: number; lon: number } | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

// Fetches nearby eat-out places from OpenStreetMap, nearest first. Throws on a
// network or parse failure so the caller (the Eat Out path in the engine, which
// already has a try/catch) can fall back; returns an empty array when OSM simply
// has nothing nearby.
export async function fetchNearbyPlaces(params: NearbyPlacesParams): Promise<NearbyPlace[]> {
  const { latitude, longitude, radiusMeters, limit = 20 } = params;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `data=${encodeURIComponent(buildQuery(latitude, longitude, radiusMeters))}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const elements = data.elements ?? [];

  const places: NearbyPlace[] = [];
  for (const element of elements) {
    const name = element.tags?.name;
    const amenity = element.tags?.amenity as PlaceCategory | undefined;
    const coords = coordsOf(element);
    // Skip anything without a name, a known eat-out amenity, or a position: it is
    // not something we can show or place on a map.
    if (!name || !amenity || !EAT_OUT_AMENITIES.includes(amenity) || !coords) {
      continue;
    }
    places.push({
      id: `osm_${element.type}_${element.id}`,
      name,
      latitude: coords.lat,
      longitude: coords.lon,
      distanceMeters: distanceMeters(latitude, longitude, coords.lat, coords.lon),
      cuisine: element.tags?.cuisine ?? null,
      category: amenity,
    });
  }

  places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return places.slice(0, limit);
}
