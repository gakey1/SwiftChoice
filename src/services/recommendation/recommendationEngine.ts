// Define what a Food Option choice looks like
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

// The Mock Pool: The database of choices for the app to pick from
export const FOOD_POOL: FoodOption[] = [
  { fuel_id: "1", user_id: "user_123", item_name: "Home-cooked Instant Noodles", type: "in", budget_level: "$", prep_time: "short", distance_range: "near", rating: "4.0" },
  { fuel_id: "2", user_id: "user_123", item_name: "Gourmet Homemade Pasta", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.5" },
  { fuel_id: "3", user_id: "user_123", item_name: "Local Fast Food Drive-thru", type: "out", budget_level: "$", prep_time: "short", distance_range: "near", rating: "3.5" },
  { fuel_id: "4", user_id: "user_123", item_name: "City Center Steakhouse", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "far", rating: "5.0" },
  { fuel_id: "5", user_id: "user_123", item_name: "Cozy Neighborhood Cafe", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.2" },
  { fuel_id: "6", user_id: "user_123", item_name: "Slow-roasted Home BBQ", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "near", rating: "4.8" },
];

// Define the filter criteria matching the FuelScreen states
export interface FilterCriteria {
  type: "in" | "out";
  budget: "$" | "$$" | "$$$";
  prepTime: "short" | "medium" | "long";
  distance: "near" | "mid" | "far";
}

/*
 * Recommendation Algorithm
 * Filters the food pool by criteria, then selects exactly ONE random option.
 */
export function getRecommendation(criteria: FilterCriteria): FoodOption | null {
  // Filter the pool down to matches
  const matchingOptions = FOOD_POOL.filter((food) => {
    return (
      food.type === criteria.type &&
      food.budget_level === criteria.budget &&
      food.prep_time === criteria.prepTime &&
      food.distance_range === criteria.distance
    );
  });

  // If no items match the exact strict filters, return null
  if (matchingOptions.length === 0) {
    return null;
  }

  // Select exactly ONE option randomly from the matching pool
  const randomIndex = Math.floor(Math.random() * matchingOptions.length);
  const selectedOption = matchingOptions[randomIndex];
  
  return selectedOption !== undefined ? selectedOption : null;
}