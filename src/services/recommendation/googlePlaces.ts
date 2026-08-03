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
const AUTOCOMPLETE_ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_ENDPOINT = "https://places.googleapis.com/v1/places";

// Google asks for visible credit wherever their place data is shown outside a map.
export const GOOGLE_ATTRIBUTION = "Powered by Google";

// Thrown when there is no API key configured at all, as opposed to a call that
// was made and failed. Its own type because the two need telling apart further
// up: a missing key is a setup step nobody has done, and saying "no matches
// found" for it sends the reader looking for a bug in the filters.
//
// This is the state anyone running the project from a fresh copy lands in,
// since the key lives in .env and .env is deliberately not in the repository.
export class MissingPlacesKeyError extends Error {
  constructor() {
    super(
      "Missing EXPO_PUBLIC_GOOGLE_PLACES_KEY. Copy .env.example to .env and fill in the key."
    );
    this.name = "MissingPlacesKeyError";
  }
}

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
    // Bias the search to Australia. Without this a bare suburb name is a
    // worldwide search: plenty of Australian suburb names exist in Britain and
    // the United States, and nothing in the query says which country is meant,
    // so somebody typing their own suburb could be shown results overseas with
    // no hint anything was wrong.
    //
    // This narrows the country, not the distance. A typed area still has no
    // coordinates to measure from, so results can sit well outside the suburb
    // asked for, and the card falls back to the distance band rather than
    // printing a figure nobody measured. Fixing that properly needs the typed
    // area turned into a real position.
    regionCode: "AU",
  });
}

// One suggestion offered while somebody is typing where they are.
export type AreaSuggestion = {
  // Google's identifier, used to look the coordinates up once it is chosen.
  placeId: string;
  // What to show in the list, e.g. "Belgrave VIC 3160, Australia".
  label: string;
};

// Suggests real places as the user types an area, so they choose one instead of
// typing a name we then have to guess at.
//
// Why this exists: a free-text suburb is ambiguous even inside one country.
// Several Australian states have a Belgrave, a Richmond and a Springfield, and
// a plain text search cannot tell which was meant, so it silently picks one.
// Choosing from a list settles it before any search runs, and hands back an id
// that resolves to exact coordinates.
//
// Billing, which is the reason for the session token. Autocomplete calls made
// under one token and finished with a Place Details call are not charged; only
// the Details call is. Without a token, or if the person never chooses
// anything, each keystroke request is billed on its own. So the token must be
// the same for every call in one typing session and must be passed on to
// fetchAreaCoordinates at the end of it.
export async function fetchAreaSuggestions(
  input: string,
  sessionToken: string
): Promise<AreaSuggestion[]> {
  const key = requireKey();

  const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({
      input,
      sessionToken,
      // Areas rather than businesses. Without this the list fills with cafes
      // and shops, which is not what "where are you?" is asking for.
      includedPrimaryTypes: ["(regions)"],
      // Australia only. Same reasoning as the text search, applied earlier: an
      // overseas suburb should never reach the list to be picked in the first
      // place.
      includedRegionCodes: ["AU"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Places autocomplete failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    suggestions?: {
      placePrediction?: { placeId?: string; text?: { text?: string } };
    }[];
  };

  // Entries without a placePrediction are query predictions, which are search
  // phrases rather than places and have no id to resolve, so they are dropped.
  return (data.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction?.placeId || !prediction.text?.text) return [];
    return [{ placeId: prediction.placeId, label: prediction.text.text }];
  });
}

// Turns a chosen suggestion into real coordinates, which is what makes the
// typed-area path behave like the location path: a real centre to search around
// and a real point to measure distance from.
//
// Only the location field is asked for. Place Details is billed by the fields
// requested, exactly like the searches above, and location alone sits in the
// cheapest tier. Adding fields here would quietly move every call up a tier.
export async function fetchAreaCoordinates(
  placeId: string,
  sessionToken: string
): Promise<{ latitude: number; longitude: number }> {
  const key = requireKey();

  const response = await fetch(
    `${DETAILS_ENDPOINT}/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": key,
        // No spaces allowed in a field mask.
        "X-Goog-FieldMask": "location",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Place details failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    location?: { latitude?: number; longitude?: number };
  };

  if (data.location?.latitude === undefined || data.location.longitude === undefined) {
    throw new Error("Place details returned no location");
  }

  return { latitude: data.location.latitude, longitude: data.location.longitude };
}

// The key, or the error that says it was never configured.
function requireKey(): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) {
    throw new MissingPlacesKeyError();
  }
  return key;
}

// Shared call for both searches. Throws if the key is missing or the call fails,
// so the recommendation engine's existing try and catch handles it and the user
// sees the no-match state rather than a crash.
async function request(endpoint: string, body: unknown): Promise<GooglePlaceResult[]> {
  const key = requireKey();

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
