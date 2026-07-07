// A stand-in for the Google Places API used while building. It waits a moment to
// act like a real network call, then returns a small fixed list of Melbourne
// places filtered by the chosen budget. The real API can replace this later.

export type GooglePlaceResult = {
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  rating: number;
  priceLevel: "PRICE_LEVEL_INEXPENSIVE" | "PRICE_LEVEL_MODERATE" | "PRICE_LEVEL_EXPENSIVE";
  regularOpeningHours?: { openNow: boolean };
};

//This simulates a live response from the Google Places API for testing
export async function fetchMockGooglePlaces(budgetFilter: string): Promise<GooglePlaceResult[]> {
  //Simulate network delay of 600ms
  await new Promise((resolve) => setTimeout(resolve, 600));

  //Map UI string constraints cleanly to Google's official API keys
  let targetGooglePrice: string = "PRICE_LEVEL_MODERATE";
  if (budgetFilter === "$") targetGooglePrice = "PRICE_LEVEL_INEXPENSIVE";
  if (budgetFilter === "$$$") targetGooglePrice = "PRICE_LEVEL_EXPENSIVE";

  const localAustralianMockDatabase: GooglePlaceResult[] = [
    {
      displayName: { text: "Guzman y Gomez", languageCode: "en" },
      formattedAddress: "Swanston St, Melbourne VIC 3000",
      rating: 4.2,
      priceLevel: "PRICE_LEVEL_INEXPENSIVE",
      regularOpeningHours: { openNow: true }
    },
    {
      displayName: { text: "Local Cafe & Bistro", languageCode: "en" },
      formattedAddress: "Elizabeth St, Melbourne VIC 3000",
      rating: 4.5,
      priceLevel: "PRICE_LEVEL_MODERATE",
      regularOpeningHours: { openNow: true }
    },
    {
      displayName: { text: "Premium Steakhouse", languageCode: "en" },
      formattedAddress: "Collins St, Melbourne VIC 3000",
      rating: 4.8,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      regularOpeningHours: { openNow: false }
    }
  ];

  //Filter the live API simulation based on Google's actual priceLevel schema
  return localAustralianMockDatabase.filter(place => place.priceLevel === targetGooglePrice);
}
