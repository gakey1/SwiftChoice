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
  // === EAT IN OPTIONS ===
  { fuel_id: "in_1", user_id: "user_123", item_name: "Home-cooked Instant Noodles", type: "in", budget_level: "$", prep_time: "short", distance_range: "near", rating: "4.0" },
  { fuel_id: "in_2", user_id: "user_123", item_name: "Microwave Fried Rice", type: "in", budget_level: "$", prep_time: "short", distance_range: "mid", rating: "3.8" },
  { fuel_id: "in_3", user_id: "user_123", item_name: "Toasted Cheese Sandwich", type: "in", budget_level: "$", prep_time: "short", distance_range: "far", rating: "4.2" },
  
  { fuel_id: "in_4", user_id: "user_123", item_name: "Gourmet Homemade Pasta", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.5" },
  { fuel_id: "in_5", user_id: "user_123", item_name: "Avocado Toast with Poached Egg", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.4" },
  { fuel_id: "in_6", user_id: "user_123", item_name: "Creamy Chicken Alfredo", type: "in", budget_level: "$$", prep_time: "medium", distance_range: "far", rating: "4.6" },
  
  { fuel_id: "in_7", user_id: "user_123", item_name: "Slow-roasted Home BBQ", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "near", rating: "4.8" },
  { fuel_id: "in_8", user_id: "user_123", item_name: "Traditional Beef Stew", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "mid", rating: "4.7" },
  { fuel_id: "in_9", user_id: "user_123", item_name: "Oven-Baked Salmon Dinner", type: "in", budget_level: "$$$", prep_time: "long", distance_range: "far", rating: "4.9" },

  // === EAT OUT OPTIONS ===
  { fuel_id: "out_1", user_id: "user_123", item_name: "Local Fast Food Drive-thru", type: "out", budget_level: "$", prep_time: "short", distance_range: "near", rating: "3.5" },
  { fuel_id: "out_2", user_id: "user_123", item_name: "Corner Bakery Pastries", type: "out", budget_level: "$", prep_time: "short", distance_range: "mid", rating: "3.9" },
  { fuel_id: "out_3", user_id: "user_123", item_name: "Train Station Kebab Stand", type: "out", budget_level: "$", prep_time: "short", distance_range: "far", rating: "4.0" },
  
  { fuel_id: "out_4", user_id: "user_123", item_name: "Cozy Neighborhood Cafe", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "near", rating: "4.2" },
  { fuel_id: "out_5", user_id: "user_123", item_name: "Downtown Sushi Train", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.3" },
  { fuel_id: "out_6", user_id: "user_123", item_name: "Authentic Pizzeria", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "far", rating: "4.5" },
  
  { fuel_id: "out_7", user_id: "user_123", item_name: "City Center Steakhouse", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "far", rating: "5.0" },
  { fuel_id: "out_8", user_id: "user_123", item_name: "Boutique Fine Dining Bistro", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "near", rating: "4.8" },
  { fuel_id: "out_9", user_id: "user_123", item_name: "Premium Teppanyaki Grill", type: "out", budget_level: "$$$", prep_time: "long", distance_range: "mid", rating: "4.9" },
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
 * Filters the food pool by criteria, the entire matching pool
 * sorted in a completely randomized, shuffled sequence
 */
export function getRecommendation(criteria: FilterCriteria): FoodOption[] | null {
  //Filter the pool down to matches
  const matchingOptions = FOOD_POOL.filter((food) => {
    return (
      food.type === criteria.type &&
      food.budget_level === criteria.budget &&
      food.prep_time === criteria.prepTime &&
      food.distance_range === criteria.distance
    );
  });

  //Mixes the entire array list randomly
  const shuffled = [...matchingOptions];
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