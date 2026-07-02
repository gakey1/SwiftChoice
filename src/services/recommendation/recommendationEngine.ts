import { fetchMockGooglePlaces, GooglePlaceResult } from "./googlePlacesMock";
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
  { fuel_id: "out_5_b", user_id: "user_123", item_name: "Thai Fusion Express", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.5" },
  { fuel_id: "out_5_c", user_id: "user_123", item_name: "Hakata Ramen Tavern", type: "out", budget_level: "$$", prep_time: "medium", distance_range: "mid", rating: "4.2" },
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
  distance?: "near" | "mid" | "far" | undefined;
  //placeholders for live GPS data
  userLatitude?: number; 
  userLongitude?: number;
}

/*
 * Recommendation Algorithm
 * Filters the food pool by criteria, the entire matching pool
 * sorted in a completely randomized, shuffled sequence
 */ 
export async function getRecommendation(criteria: FilterCriteria): Promise<FoodOption[] | null> {
  
  // PATHWAY A: EAT IN (Keep original local mock code)
  if (criteria.type === "in") {
    const matchingOptions = FOOD_POOL.filter((food) => {
      return (
        food.type === "in" &&
        food.budget_level === criteria.budget &&
        food.prep_time === criteria.prepTime
      );
    });

    //Mixes the array list randomly
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
    return Promise.resolve(shuffled);
  }

  // PATHWAY B: EAT OUT (Bypass local pool, use External Google API structure)
  try {
    //Check if device location was provided, otherwise default to city center
    const lat = criteria.userLatitude || -37.8136; 
    const lng = criteria.userLongitude || 144.9631;

    console.log(`[GPS Gateway] User Location detected at Lat: ${lat}, Lng: ${lng}`);
    console.log(`[API Gateway] Routing request to Google Places API for radius: ${criteria.distance || "near"}`);
    console.log(`[Gateway] Routing request to Google Places API structure for budget: ${criteria.budget}`);
    
    //Call our simulated network data stream
    const apiResults: GooglePlaceResult[] = await fetchMockGooglePlaces(criteria.budget);
    
    //Transform the raw Google API payload objects into your app's internal FoodOption schema
    const transformedOptions: FoodOption[] = apiResults.map((place, index) => {
      return {
        fuel_id: `google_${index}_${Date.now()}`, //Generate unique mock database ID
        user_id: "user_123",
        item_name: place.displayName.text, //Extracting string name from Google object
        type: "out",
        budget_level: criteria.budget, //Matches the user's filtered level
        prep_time: criteria.prepTime,   //Retains user preference
        distance_range: criteria.distance || "near", //Uses selected distance or fallback
        rating: place.rating.toFixed(1), //Formats Google number rating (e.g. 4.5) to string
      };
    });

    //Shuffle the API results just in case there are multiple matches
    const shuffled = [...transformedOptions];
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

  } catch (error) {
    console.error("External API Gateway Tier Failure:", error);
    return null; 
  }
}