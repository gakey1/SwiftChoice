// Finds real places to eat near the user through the Google Places API (New).
// This replaces the mock that stood in for it while the module was being built.
//
// Cost note, because it is decided here rather than in the console. Google bills
// by which fields are asked for, not only by how many calls are made. Asking for
// the rating or the price level puts the call in the dearest tier, which has the
// smallest free monthly allowance. The field list below is therefore the whole
// cost control for this project, so do not add fields to it without checking
// what tier they fall into first. One call returns a list, and rerolls read
// from that list rather than calling again.

const NEARBY_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const TEXT_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Google asks for visible credit wherever their place data is shown outside a map.
export const GOOGLE_ATTRIBUTION = "Powered by Google";

// The kinds of place the Fuel module looks for.
const INCLUDED_TYPES = ["restaurant", "cafe", "meal_takeaway"];

// Only these fields are requested. Adding to this list can move every call into
// a more expensive tier, so treat it as a deliberate decision, not a detail.
const FIELD_MASK = [
  "places.displayName",
  "places.location",
  "places.rating",
  "places.priceLevel",
].join(",");

// Google's price bands. A place can come back with none of these set, which is
// why the field is optional here rather than assumed.
export type GooglePriceLevel =
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

// One place as the app uses it. Everything except the name is optional because
// Google genuinely omits these on real records, unlike the mock which always
// filled them in.
export type GooglePlaceResult = {
  displayName: { text: string; languageCode?: string };
  rating?: number;
  priceLevel?: GooglePriceLevel;
  location?: { latitude: number; longitude: number };
};

export type NearbyPlacesParams = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  // Google caps this at 20. One call therefore covers a search and its rerolls.
  limit?: number;
};

// Asks Google for places near a point. Throws if the key is missing or the call
// fails, so the recommendation engine's existing try and catch handles it and
// the user sees the no-match state rather than a crash.
export async function fetchNearbyPlaces(
  params: NearbyPlacesParams
): Promise<GooglePlaceResult[]> {
  return request(NEARBY_ENDPOINT, {
    includedTypes: INCLUDED_TYPES,
    maxResultCount: Math.min(params.limit ?? 20, 20),
    locationRestriction: {
      circle: {
        center: { latitude: params.latitude, longitude: params.longitude },
        radius: params.radiusMeters,
      },
    },
  });
}

// Finds places by a typed area instead of a position, for when the phone will
// not give its location and the user tells us where they are. This is the same
// Places product and the same key, so it needs no extra setup, and it saves a
// separate step to turn the typed area into coordinates.
export async function fetchPlacesByArea(
  area: string,
  limit = 20
): Promise<GooglePlaceResult[]> {
  return request(TEXT_ENDPOINT, {
    textQuery: `restaurants and cafes in ${area}`,
    maxResultCount: Math.min(limit, 20),
  });
}

// Shared call for both searches. Throws if the key is missing or the call fails,
// so the recommendation engine's existing try and catch handles it and the user
// sees the no-match state rather than a crash.
async function request(endpoint: string, body: unknown): Promise<GooglePlaceResult[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_GOOGLE_PLACES_KEY. Copy .env.example to .env and ask the team lead for the value."
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  const places = (payload as { places?: unknown }).places;

  // A search with no matches comes back without a places array at all, which is
  // a normal empty result rather than a failure.
  if (!Array.isArray(places)) {
    return [];
  }

  // Keep only records that at least have a name, since a nameless place cannot
  // be shown to the user.
  return places.filter(
    (place): place is GooglePlaceResult =>
      typeof place === "object" &&
      place !== null &&
      typeof (place as GooglePlaceResult).displayName?.text === "string"
  );
}
