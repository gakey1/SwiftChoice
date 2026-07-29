// The recommendation engine for the Fuel and Focus modules. It holds the mock
// data pools and the functions that filter them by the user's choices and
// return the matches in a shuffled order. Eat Out is routed through a mock of
// the Google Places API so the real one can be swapped in later.

import { fetchNearbyPlaces, fetchPlacesByArea, type GooglePlaceResult } from "./googlePlaces";
import { getCurrentPosition } from "@/services/location/locationService";

// Define what a Food Option choice looks like.
export interface FoodOption {
  fuel_id: string;
  user_id: string;
  item_name: string;
  type: "in" | "out";
  budget_level: "$" | "$$" | "$$$";
  prep_time: "short" | "medium" | "long";
  distance_range: "near" | "mid" | "far";
  rating: string;
  // Set to the area the user typed when the search used that instead of the
  // phone's position. The screen shows it, so a result is never presented as
  // nearby when it came from a typed area rather than real location.
  searched_area?: string | undefined;
}

// The mock Fuel pool used by the Eat In recommendation flow.
export const FOOD_POOL: FoodOption[] = [
  { fuel_id: "in_1", user_id: "user_123", item_name: "Home-cooked Instant Noodles", type: "in", budget_level: "$", prep_time: "short", distance_range: "near", rating: "4.0" },
  { fuel_id: "in_2", user_id: "user_123", item_name: "Microwave Fried Rice", type: "in", budget_level: "$", prep_time: "short", distance_range: "mid", rating: "3.8" },
  { fuel_id: "in_3", user_id: "user_123", item_name: "Toasted Cheese Sandwich", type: "in", budget_level: "$", prep_time: "short", distance_range: "far", rating: "4.2" },
  { fuel_id: "in_4", user_id: "user_123", item_name: "Gourmet Homemade Pasta", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.5" },
  { fuel_id: "in_5", user_id: "user_123", item_name: "Avocado Toast with Poached Egg", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.4" },
  { fuel_id: "in_6", user_id: "user_123", item_name: "Creamy Chicken Alfredo", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "far", rating: "4.6" },
  { fuel_id: "in_7", user_id: "user_123", item_name: "Slow-roasted Home BBQ", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "near", rating: "4.8" },
  { fuel_id: "in_8", user_id: "user_123", item_name: "Traditional Beef Stew", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "mid", rating: "4.7" },
  { fuel_id: "in_9", user_id: "user_123", item_name: "Oven-Baked Salmon Dinner", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "far", rating: "4.9" },
  { fuel_id: "out_1", user_id: "user_123", item_name: "Local Fast Food Drive-thru", type: "out", budget_level: "$", prep_time: "short", distance_range: "near", rating: "3.5" },
  { fuel_id: "out_2", user_id: "user_123", item_name: "Corner Bakery Pastries", type: "out", budget_level: "$", prep_time: "short", distance_range: "mid", rating: "3.9" },
  { fuel_id: "out_3", user_id: "user_123", item_name: "Train Station Kebab Stand", type: "out", budget_level: "$", prep_time: "short", distance_range: "far", rating: "4.0" },
  { fuel_id: "out_4", user_id: "user_123", item_name: "Cozy Neighborhood Cafe", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.2" },
  { fuel_id: "out_5", user_id: "user_123", item_name: "Downtown Sushi Train", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.3" },
  { fuel_id: "out_5_b", user_id: "user_123", item_name: "Thai Fusion Express", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.5" },
  { fuel_id: "out_5_c", user_id: "user_123", item_name: "Hakata Ramen Tavern", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.2" },
  { fuel_id: "out_6", user_id: "user_123", item_name: "Authentic Pizzeria", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "far", rating: "4.5" },
  { fuel_id: "out_7", user_id: "user_123", item_name: "City Center Steakhouse", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "far", rating: "5.0" },
  { fuel_id: "out_8", user_id: "user_123", item_name: "Boutique Fine Dining Bistro", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "near", rating: "4.8" },
  { fuel_id: "out_9", user_id: "user_123", item_name: "Premium Teppanyaki Grill", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "mid", rating: "4.9" },
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
function mapTierToSymbol(tierOrSymbol: string): "$" | "$$" | "$$$" {
  if (tierOrSymbol === 'budget') return '$';
  if (tierOrSymbol === 'moderate') return '$$';
  if (tierOrSymbol === 'premium') return '$$$';
  if (tierOrSymbol === '$' || tierOrSymbol === '$$' || tierOrSymbol === '$$$') {
    return tierOrSymbol;
  }
  return '$$'; // Default fallback
}
export async function getRecommendation(
  criteria: FilterCriteria
): Promise<FoodOption[] | null | typeof LOCATION_REQUIRED> {
  // Convert whatever came from settings/survey into the symbol format your pool/API expects
  const resolvedBudget = mapTierToSymbol(criteria.budget);

  // Pathway A: Eat In. Filter the local pool by budget and prep time.
  if (criteria.type === "in") {
    const matchingOptions = FOOD_POOL.filter((food) => {
      return (
        food.type === "in" &&
        food.budget_level === resolvedBudget &&
        food.prep_time === criteria.prepTime
      );
    });

    return shuffleOptions(matchingOptions);
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

    const hasPosition = lat !== undefined && lng !== undefined;
    const typedArea = criteria.manualArea?.trim();

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
        distance_range: criteria.distance ?? "near",
        // Empty means Google holds no rating for this place. The screen hides
        // the rating chip rather than showing a zero or an invented score.
        rating: place.rating === undefined ? "" : place.rating.toFixed(1),
        searched_area: hasPosition ? undefined : typedArea,
      };
    });

    return shuffleOptions(transformedOptions);
  } catch (error) {
    console.warn("Live places lookup failed:", error);

    return null;
  }
}

// Define what a Focus option looks like.
export interface FocusOption {
  focus_id: string;
  user_id: string;
  spot_name: string;
  energy_level: "low" | "medium" | "high";
  vibe: "silent" | "background" | "collaborative";
  rating: string;
}

// Temporary Focus pool used until the real pool is connected.
export const FOCUS_POOL: FocusOption[] = [
  { focus_id: "focus_1", user_id: "user_123", spot_name: "Quiet Library Desk", energy_level: "low", vibe: "silent", rating: "4.8" },
  { focus_id: "focus_2", user_id: "user_123", spot_name: "Home Study Corner", energy_level: "low", vibe: "background", rating: "4.2" },
  { focus_id: "focus_3", user_id: "user_123", spot_name: "Small Group Study Room", energy_level: "low", vibe: "collaborative", rating: "4.0" },
  { focus_id: "focus_4", user_id: "user_123", spot_name: "University Library Floor", energy_level: "medium", vibe: "silent", rating: "4.6" },
  { focus_id: "focus_5", user_id: "user_123", spot_name: "Cafe With Soft Music", energy_level: "medium", vibe: "background", rating: "4.4" },
  { focus_id: "focus_6", user_id: "user_123", spot_name: "Campus Common Area", energy_level: "medium", vibe: "collaborative", rating: "4.1" },
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

// Filters the Focus pool by energy and vibe, then returns shuffled matches.
export function getFocusRecommendation(criteria: FocusCriteria): FocusOption[] {
  const matchingOptions = FOCUS_POOL.filter((spot) => {
    return (
      spot.energy_level === criteria.energyLevel &&
      spot.vibe === criteria.vibe
    );
  });

  return shuffleOptions(matchingOptions);
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
