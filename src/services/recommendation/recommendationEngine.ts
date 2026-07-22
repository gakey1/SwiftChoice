// The recommendation engine for the Fuel and Focus modules. It holds the mock
// data pools and the functions that filter them by the user's choices and
// return the matches in a shuffled order. Eat Out is routed through a mock of
// the Google Places API so the real one can be swapped in later.

import { fetchMockGooglePlaces, type GooglePlaceResult } from "./googlePlacesMock";

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
}

/*
 * Recommendation algorithm.
 * Eat In filters the local pool; Eat Out routes through the external Google
 * Places API structure (mocked for now). Both paths return the matching set in
 * a randomly shuffled order.
 */

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
): Promise<FoodOption[] | null> {
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

  //Pathway B: Eat Out. Bypass the local pool and use the external Google
  //Places API structure.
  try {
    //Use the device location if provided, otherwise default to Melbourne CBD.
    const lat = criteria.userLatitude ?? -37.8136;
    const lng = criteria.userLongitude ?? 144.9631;

    console.warn(`[GPS Gateway] User location at Lat: ${lat}, Lng: ${lng}`);
    console.warn(
      `[API Gateway] Routing to Google Places for radius: ${criteria.distance ?? "near"}, budget: ${criteria.budget}`
    );

    const apiResults: GooglePlaceResult[] = await fetchMockGooglePlaces(
      resolvedBudget
    );

    // Transform the raw Google API payload into the app's FoodOption schema.
    const transformedOptions: FoodOption[] = apiResults.map((place, index) => {
      return {
        fuel_id: `google_${index}_${Date.now()}`,
        user_id: "user_123",
        item_name: place.displayName.text,
        type: "out",
        budget_level: resolvedBudget,
        prep_time: criteria.prepTime,
        distance_range: criteria.distance ?? "near",
        rating: place.rating.toFixed(1),
      };
    });

    return shuffleOptions(transformedOptions);
  } catch (error) {
    console.error("External API gateway tier failure:", error);

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
