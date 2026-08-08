// The recommendation engine for the Fuel and Focus modules. It holds the mock
// data pools and the functions that filter them by the user's choices and
// return the matches in a shuffled order. Eat Out is routed through a mock of
// the Google Places API so the real one can be swapped in later.

import {
  fetchNearbyPlaces,
  readableAddress,
  fetchPlacesByArea,
  MissingPlacesKeyError,
  type GooglePlaceResult,
} from "./googlePlaces";
import { getCurrentPosition } from "@/services/location/locationService";
import {
  getFocusRecommendationPool,
  type FocusPoolItem,
} from "@/features/focus/focusPoolStorage";
import { distanceMeters } from "./openStreetMapPlaces";
import { getFuelRecommendationPool } from "@/features/fuel/fuelPoolStorage";

// Define what a Food Option choice looks like.
export interface FoodOption {
  fuel_id: string;
  user_id: string;
  item_name: string;
  type: "in" | "out";
  budget_level: "$" | "$$" | "$$$";
  prep_time: "short" | "medium" | "long";
  effort: "Easy" | "Medium" | "Hard";
  distance_range: "near" | "mid" | "far";
  rating: string;
  // How far the place actually is from where the search ran, in metres. Only
  // set for live Eat Out results, where we know both points. The card shows this
  // instead of the distance band the user picked, so the figure is measured
  // rather than assumed.
  distance_meters?: number | undefined;
  // Set to the area the user typed when the search used that instead of the
  // phone's position. The screen shows it, so a result is never presented as
  // nearby when it came from a typed area rather than real location.
  searched_area?: string | undefined;
  // The street address, for live Eat Out results only. A distance alone tells
  // you how far but not which way, so this is what makes a result actionable.
  // Undefined for pool items, which have no address, and for places Google holds
  // no address for.
  address?: string | undefined;
}

// The mock Fuel pool used by the Eat In recommendation flow.
export const FOOD_POOL: FoodOption[] = [
  { fuel_id: "in_1", user_id: "user_123", item_name: "Home-cooked Instant Noodles", type: "in", budget_level: "$", prep_time: "short", effort: "Easy", distance_range: "near", rating: "4.0" },
  { fuel_id: "in_2", user_id: "user_123", item_name: "Microwave Fried Rice", type: "in", budget_level: "$", prep_time: "short", effort: "Easy", distance_range: "mid", rating: "3.8" },
  { fuel_id: "in_3", user_id: "user_123", item_name: "Toasted Cheese Sandwich", type: "in", budget_level: "$", prep_time: "short", effort: "Easy", distance_range: "far", rating: "4.2" },
  { fuel_id: "in_4", user_id: "user_123", item_name: "Gourmet Homemade Pasta", type: "in", budget_level: "$$", prep_time: "medium", effort: "Medium", distance_range: "near", rating: "4.5" },
  { fuel_id: "in_5", user_id: "user_123", item_name: "Avocado Toast with Poached Egg", type: "in", budget_level: "$$", prep_time: "medium", effort: "Medium", distance_range: "mid", rating: "4.4" },
  { fuel_id: "in_6", user_id: "user_123", item_name: "Creamy Chicken Alfredo", type: "in", budget_level: "$$", prep_time: "medium", effort: "Medium", distance_range: "far", rating: "4.6" },
  { fuel_id: "in_7", user_id: "user_123", item_name: "Slow-roasted Home BBQ", type: "in", budget_level: "$$$", prep_time: "long", effort: "Hard", distance_range: "near", rating: "4.8" },
  { fuel_id: "in_8", user_id: "user_123", item_name: "Traditional Beef Stew", type: "in", budget_level: "$$$", prep_time: "long", effort: "Hard", distance_range: "mid", rating: "4.7" },
  { fuel_id: "in_9", user_id: "user_123", item_name: "Oven-Baked Salmon Dinner", type: "in", budget_level: "$$$", prep_time: "long", effort: "Hard", distance_range: "far", rating: "4.9" },
];

// Define the filter criteria matching the FuelScreen states.
export interface FilterCriteria {
  type: "in" | "out";
  budget: "$" | "$$" | "$$$";
  prepTime: "short" | "medium" | "long";
  // Distance only applies to Eat Out, so it is optional. The explicit
  // `| undefined` is required because the project runs exactOptionalPropertyTypes,
  // and FuelScreen passes distance: undefined for the Eat In path.
  distance?: "near" | "mid" | "far" | undefined;
  // Placeholders for live GPS data (Eat Out, future Expo location streaming).
  userLatitude?: number;
  userLongitude?: number;
  // An area the user typed, used only when the phone would not give a position.
  manualArea?: string | undefined;
  // Where that area actually is, when it was chosen from the suggestion list
  // rather than typed freehand. Present together or not at all. With them the
  // search runs on a real centre and radius, which is what stops a suburb
  // search returning somewhere half an hour's drive away.
  areaLatitude?: number | undefined;
  areaLongitude?: number | undefined;
}

/*
 * Recommendation algorithm.
 * Eat In filters the local pool; Eat Out routes through the external Google
 * Places API structure (mocked for now). Both paths return the matching set in
 * a randomly shuffled order.
 */
// Returned when Eat Out has no way to know where the user is: the phone would
// not give a position and no area was typed in. The screen asks for an area
// rather than guessing a city, because a guess would show somebody in Queensland
// a list of Melbourne restaurants and call them nearby.
export const LOCATION_REQUIRED = "LOCATION_REQUIRED" as const;

// Returned when no Places key is configured, which is not the same thing as a
// search that found nothing. Anyone running the project from a fresh copy hits
// this, because the key lives in .env and .env is deliberately not committed.
// Telling them "no matches found" would send them hunting through the filters
// for a fault that is really an unfinished setup step.
export const PLACES_KEY_MISSING = "PLACES_KEY_MISSING" as const;

// How far out to search for each distance choice on the Fuel screen.
const RADIUS_BY_DISTANCE: Record<"near" | "mid" | "far", number> = {
  near: 1000,
  mid: 3000,
  far: 8000,
};

// Turns Google's price band into the symbol the rest of the app uses. Returns
// null when Google holds no price for the place, which is common and must not
// be mistaken for cheap.
function priceLevelToSymbol(level: string | undefined): "$" | "$$" | "$$$" | null {
  switch (level) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$";
    default:
      return null;
  }
}

// Helper to map UI tiers ('budget', 'moderate', 'premium') to database symbols ('$', '$$', '$$$')
function mapTierToSymbol(tierOrSymbol: string | undefined): "$" | "$$" | "$$$" {
  // If undefined or empty, return a safe default fallback
  if (!tierOrSymbol) {
    return '$$';
  }

  if (tierOrSymbol === '$' || tierOrSymbol === '$$' || tierOrSymbol === '$$$') {
    return tierOrSymbol;
  }

  // If it's a dynamic range string (e.g. "$15 - $22" or custom ranges)
  if (tierOrSymbol.includes('-')) {
    // Look at the lower bound of the range to determine the tier
    const cleanLower = tierOrSymbol.split('-')[0]!.replace('$', '').trim();
    const lowVal = parseInt(cleanLower, 10);

    // Dynamic thresholds based on your scaling
    if (lowVal < 30) return '$';    // Lower tier range
    if (lowVal < 50) return '$$';   // Moderate tier range
    return '$$$';                   // Premium / High tier range
  }

  if (tierOrSymbol === 'budget') return '$';
  if (tierOrSymbol === 'moderate') return '$$';
  if (tierOrSymbol === 'premium') return '$$$';
  /*if (tierOrSymbol === '$' || tierOrSymbol === '$$' || tierOrSymbol === '$$$') {
    return tierOrSymbol;
  }
  return '$$'; // Default fallback
  */
 return '$$'; // Default fallback
}
export async function getRecommendation(
  criteria: FilterCriteria
): Promise<FoodOption[] | null | typeof LOCATION_REQUIRED | typeof PLACES_KEY_MISSING> {
  // Convert whatever came from settings/survey into the symbol format your pool/API expects
  const resolvedBudget = mapTierToSymbol(criteria.budget);

  // Pathway A: Eat In. Filter the local pool by budget and prep time.
  if (criteria.type === "in") {
    const localPool = await getFuelRecommendationPool();

    let resolvedPrepTime: "short" | "medium" | "long" = "short";
    const rawPrep = String(criteria.prepTime);
    
    if (rawPrep.includes("15") && rawPrep.includes("30")) {
      resolvedPrepTime = "medium";
    } else if (rawPrep.includes("30+") || rawPrep.includes("long")) {
      resolvedPrepTime = "long";
    } else {
      resolvedPrepTime = "short";
    }
    
    const matchingOptions = localPool.filter((food) => {
      return (
        food.budget === resolvedBudget &&
        food.prepTime === resolvedPrepTime
      );
    });

    // Map SQLite fields to match the FoodOption interface structure if needed
    const formattedOptions: FoodOption[] = matchingOptions.map((item) => ({
      fuel_id: `local_${item.id}`,
      user_id: "user_123",
      item_name: item.name,
      type: "in",
      budget_level: item.budget,
      prep_time: item.prepTime,
      effort: item.effort || "Easy",
      distance_range: item.distance,
      rating: "4.5", // Default rating for home-cooked meals
    }));

    return shuffleOptions(formattedOptions);
  }

  // Pathway B: Eat Out. Skip the local pool and ask Google Places for real
  // places, either near the phone's position or in an area the user typed.
  try {
    let lat = criteria.userLatitude;
    let lng = criteria.userLongitude;

    if (lat === undefined || lng === undefined) {
      const position = await getCurrentPosition();
      if (position.ok) {
        lat = position.latitude;
        lng = position.longitude;
      }
    }

    const typedArea = criteria.manualArea?.trim();

    // An area chosen from the suggestion list arrives with real coordinates, so
    // it can search exactly like a phone position does: a genuine centre, the
    // chosen radius, and a real distance on every card. Only a free-typed area
    // with no choice behind it still falls back to the looser text search.
    // Whether the position is the phone's own. Recorded before the area
    // coordinates are folded in, because the card has to keep saying the result
    // is based on a place the user named rather than on where they are. Losing
    // that distinction would put an unearned "near you" on a search run from a
    // suburb they picked off a list.
    const positionFromDevice = lat !== undefined && lng !== undefined;

    if (lat === undefined && criteria.areaLatitude !== undefined) {
      lat = criteria.areaLatitude;
      lng = criteria.areaLongitude;
    }

    const hasPosition = lat !== undefined && lng !== undefined;

    // No position and nothing typed: ask rather than guess. Inventing a city
    // here is what would show a Queensland user Melbourne restaurants.
    if (!hasPosition && !typedArea) {
      return LOCATION_REQUIRED;
    }

    const apiResults: GooglePlaceResult[] = hasPosition
      ? await fetchNearbyPlaces({
          latitude: lat as number,
          longitude: lng as number,
          radiusMeters: RADIUS_BY_DISTANCE[criteria.distance ?? "near"],
        })
      : await fetchPlacesByArea(typedArea as string);

    // Google has no price filter on a nearby search, so the budget is applied
    // here instead. Places with no price level are kept rather than dropped,
    // because a missing price is common and dropping them can empty the list.
    const withinBudget = apiResults.filter((place) => {
      const level = priceLevelToSymbol(place.priceLevel);
      return level === null || level === resolvedBudget;
    });

    // Transform Google's payload into the app's FoodOption schema. Rating and
    // price are both optional on real records, so neither is assumed here.
    const transformedOptions: FoodOption[] = withinBudget.map((place, index) => {
      const placeBudget = priceLevelToSymbol(place.priceLevel);

      return {
        fuel_id: `google_${index}_${Date.now()}`,
        user_id: "user_123",
        item_name: place.displayName.text,
        type: "out",
        // The place's own price where Google knows it, otherwise the band the
        // user asked for. Never a made-up figure.
        budget_level: placeBudget ?? resolvedBudget,
        prep_time: criteria.prepTime,
        effort: "Easy",
        distance_range: criteria.distance ?? "near",
        // Empty means Google holds no rating for this place. The screen hides
        // the rating chip rather than showing a zero or an invented score.
        rating: place.rating === undefined ? "" : place.rating.toFixed(1),
        searched_area: positionFromDevice ? undefined : typedArea,
        // Straight from Google, never assembled by us. An address we composed
        // could send somebody to the wrong building.
        address: readableAddress(place),
        // Measured whenever there is a centre to measure from, which now
        // includes an area chosen off the list. Only a freehand area with no
        // coordinates behind it leaves this unset, and that card falls back to
        // naming the band rather than printing a figure nobody measured.
        distance_meters:
          hasPosition && place.location
            ? distanceMeters(lat as number, lng as number, place.location.latitude, place.location.longitude)
            : undefined,
      };
    });

    return shuffleOptions(transformedOptions);
  } catch (error) {
    // A missing key is a setup step, not a failed search, and the screen says so
    // rather than blaming the filters. Kept separate from the general failure
    // below so a real network error still reads as a real network error.
    if (error instanceof MissingPlacesKeyError) {
      console.warn(error.message);
      return PLACES_KEY_MISSING;
    }

    console.warn("Live places lookup failed:", error);

    return null;
  }
}

// Define what a Focus option looks like.
export interface FocusOption {
  focus_id: string;
  user_id?: string | undefined;
  spot_name: string;
  energy_level: "low" | "medium" | "high";
  vibe: "silent" | "background" | "collaborative";
  // Optional because the saved pool has no rating column, and the proposal's
  // FocusSpot never had one either. The figures on the fallback list below were
  // written by hand, so a spot from the pool shows no rating rather than one we
  // made up.
  rating?: string | undefined;
  // Whether the spot is outside. Only outdoor spots get the conditions strip,
  // since the weather is irrelevant to a library desk.
  outdoor?: boolean | undefined;
  // The picture the result card shows, stored on the spot. Optional because the
  // fallback list below carries none, and validated by spotIcon() before use.
  icon?: string | undefined;
}

// Fallback list, used only when the saved pool cannot be read.
//
// The saved pool is the real source now. This stays because a database that
// fails to open would otherwise leave the module with nothing to recommend, and
// a demo that shows a spot is better than one that shows an error. It is not
// reached in normal use.
export const FOCUS_POOL: FocusOption[] = [
  { focus_id: "focus_1", user_id: "user_123", spot_name: "Quiet Library Desk", energy_level: "low", vibe: "silent", rating: "4.8" },
  { focus_id: "focus_2", user_id: "user_123", spot_name: "Home Study Corner", energy_level: "low", vibe: "background", rating: "4.2" },
  { focus_id: "focus_2_b", user_id: "user_123", spot_name: "Park Bench, Fresh Air", energy_level: "low", vibe: "silent", rating: "4.3", outdoor: true },
  { focus_id: "focus_3", user_id: "user_123", spot_name: "Small Group Study Room", energy_level: "low", vibe: "collaborative", rating: "4.0" },
  { focus_id: "focus_4", user_id: "user_123", spot_name: "University Library Floor", energy_level: "medium", vibe: "silent", rating: "4.6" },
  { focus_id: "focus_5", user_id: "user_123", spot_name: "Cafe With Soft Music", energy_level: "medium", vibe: "background", rating: "4.4" },
  { focus_id: "focus_6", user_id: "user_123", spot_name: "Campus Common Area", energy_level: "medium", vibe: "collaborative", rating: "4.1", outdoor: true },
  { focus_id: "focus_7", user_id: "user_123", spot_name: "Silent Study Zone", energy_level: "high", vibe: "silent", rating: "4.7" },
  { focus_id: "focus_8", user_id: "user_123", spot_name: "Busy Coffee Shop", energy_level: "high", vibe: "background", rating: "4.3" },
  { focus_id: "focus_9", user_id: "user_123", spot_name: "Group Project Room", energy_level: "high", vibe: "collaborative", rating: "4.5" },
  { focus_id: "focus_10", user_id: "user_123", spot_name: "Library Quiet Corner", energy_level: "low", vibe: "silent", rating: "4.5" },
  { focus_id: "focus_11", user_id: "user_123", spot_name: "Calm Desk Near Window", energy_level: "low", vibe: "silent", rating: "4.3" },
];

export interface FocusCriteria {
  energyLevel: "low" | "medium" | "high";
  vibe: "silent" | "background" | "collaborative";
}

// Turns a saved pool row into the shape the Focus screen already renders.
//
// The pool stores an integer id, so it is stringified here to match the rest of
// the app, where a decision's focus_id is a string. No rating is set, because
// the pool holds none.
function toFocusOption(item: FocusPoolItem): FocusOption {
  return {
    focus_id: String(item.id),
    spot_name: item.name,
    energy_level: item.energy,
    vibe: item.vibe,
    outdoor: item.outdoor,
    icon: item.icon,
  };
}

// Filters the Focus pool by energy and vibe, then returns shuffled matches.
//
// Reads the saved pool rather than a list written into this file, so a spot
// somebody adds is a spot the module can recommend. Async for that reason: the
// pool is on-device SQLite, and the read has to finish before there is anything
// to filter.
export async function getFocusRecommendation(
  criteria: FocusCriteria
): Promise<FocusOption[]> {
  const spots = await readFocusSpots();

  const matchingOptions = spots.filter((spot) => {
    return spot.energy_level === criteria.energyLevel && spot.vibe === criteria.vibe;
  });

  return shuffleOptions(matchingOptions);
}

// Reads the saved pool, falling back to the built-in list if the database will
// not answer. A failure here is not the user's problem to solve, so it is warned
// about and worked around rather than surfaced as an error on the screen.
async function readFocusSpots(): Promise<FocusOption[]> {
  try {
    const saved = await getFocusRecommendationPool();

    if (saved.length > 0) {
      return saved.map(toFocusOption);
    }

    console.warn("Focus pool came back empty. Using the built-in list.");
  } catch (error) {
    console.warn("Could not read the Focus pool. Using the built-in list.", error);
  }

  return FOCUS_POOL;
}

// Small shared shuffle helper used by the Fuel and Focus recommendations.
function shuffleOptions<T>(options: T[]): T[] {
  const shuffled = [...options];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const itemJ = shuffled[j];

    if (temp !== undefined && itemJ !== undefined) {
      shuffled[i] = itemJ;
      shuffled[j] = temp;
    }
  }

  return shuffled;
}
