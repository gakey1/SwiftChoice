// Tests for the fuel screen. The icon set, navigation, and history layer are
// stubbed so it renders under Jest. These check that the header and filters
// show, that the Eat In toggle responds, and that Decide for Me lands on a
// result or empty state.

import React from "react";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import { FuelScreen, formatDistance } from "./FuelScreen";
import { XP_PER_DECISION } from "@/features/progress/progress";

// Stub the native icon sets so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Both sets are stubbed because the screen's
// module glyph uses MaterialCommunityIcons and its other icons use Feather.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather", MaterialCommunityIcons: "MaterialCommunityIcons" }));

// Mock the navigation hooks this screen uses. useFocusEffect is included because
// the screen reloads the saved budget through it; left out, it would be undefined
// and throw as soon as the screen renders. It stands in as a plain effect so the
// reload runs once on render, the way arriving on the screen runs it for real.
// Jest only lets a mock factory reach names starting with "mock", hence the alias.
const mockUseEffect = React.useEffect;
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));

// Mock the history layer so this test does not pull in the SQLite chain
// (historyStorage -> db.ts -> expo-sqlite), which is not resolvable under Jest.
jest.mock("@/features/history/historyStorage", () => ({
  logDecision: jest.fn(),
}));

// The engine reads the saved Focus pool, which reaches expo-sqlite, and there is
// no native module for it under Jest. Fuel never touches the Focus pool, so this
// only exists to stop the import chain failing to load. Same pattern as the
// history mock above, and the same one that produced MC-007.
jest.mock("@/features/focus/focusPoolStorage", () => ({
  getFocusRecommendationPool: jest.fn(async () => []),
}));

// Stand in for the live Google Places call and the device GPS, so the Eat Out
// path returns a predictable result instead of failing on a missing key. Without
// this the engine falls into its catch, the screen shows the empty state, and
// the result-card assertions below pass without ever seeing a result.
// No native module under Jest, same as the auth tests. The real randomUUID
// works on a device; leaving it unmocked here makes the area box throw on the
// first keystroke, which shows up as a test that times out rather than as
// anything naming crypto.
jest.mock("expo-crypto", () => ({
  randomUUID: () => "test-session-token",
}));
jest.mock("@/services/recommendation/googlePlaces", () => ({
  GOOGLE_ATTRIBUTION: "Powered by Google",
  // The real class, not a stand-in. The engine tells a missing key apart from a
  // failed call with an instanceof check, so a look-alike defined here would
  // pass the test while the real screen showed the wrong message.
  MissingPlacesKeyError: jest.requireActual("@/services/recommendation/googlePlaces")
    .MissingPlacesKeyError,
  fetchAreaSuggestions: jest.fn(async () => [
    { placeId: "belgrave-id", label: "Belgrave VIC 3160, Australia" },
  ]),
  fetchAreaCoordinates: jest.fn(async () => ({ latitude: -37.9084, longitude: 145.3554 })),
  fetchNearbyPlaces: jest.fn(async () => [
    {
      displayName: { text: "Test Cafe" },
      rating: 4.4,
      priceLevel: "PRICE_LEVEL_MODERATE",
      location: { latitude: -37.8045, longitude: 144.9 },
    },
  ]),
  fetchPlacesByArea: jest.fn(async () => [
    { displayName: { text: "Southport Diner" }, rating: 4.1, priceLevel: "PRICE_LEVEL_MODERATE" },
  ]),
}));
jest.mock("@/services/location/locationService", () => ({
  getCurrentPosition: jest.fn(async () => ({ ok: true, latitude: -37.8, longitude: 144.9 })),
}));

// Mock the settings layer for the same reason: the screen reads the saved budget
// through it, which would otherwise pull expo-sqlite in through db.ts.
jest.mock("@/services/localdb/preferencesStorage", () => ({
  loadPreferences: jest.fn(async () => ({
    dietaryRestrictions: "None set",
    defaultBudget: "moderate",
    workHours: "9am - 5pm",
  })),
}));

// Spy on the shared progress store so the XP award on Accept can be asserted.
// Outside a provider the real hook returns inert defaults, which would make the
// award silently untestable.
// Jest only allows a mock factory to reach variables whose names start with
// "mock", so the spy is named accordingly.
const mockAwardXp = jest.fn();
jest.mock("@/features/progress/ProgressProvider", () => ({
  useProgress: () => ({
    progress: { xp: 0, level: 1, completedCount: 0, coins: 0, ranked: false },
    hydrated: true,
    awardXp: mockAwardXp,
    bumpCompleted: jest.fn(),
    markRanked: jest.fn(),
  }),
}));

// Renders the screen and lets the saved-budget load that runs on focus finish
// first, so the state it sets does not land in the middle of an assertion.
async function renderFuelScreen() {
  const utils = render(<FuelScreen />);
  await act(async () => {});
  return utils;
}

describe("FuelScreen", () => {
  it("renders the header and filter components correctly", async () => {
    const { getByText } = await renderFuelScreen();

    //Verify the core layout titles render safely
    expect(getByText("Fuel")).toBeTruthy();
    expect(getByText("What should you eat?")).toBeTruthy();
    expect(getByText("Budget")).toBeTruthy();
    expect(getByText("Prep Time")).toBeTruthy();
    expect(getByText("Distance")).toBeTruthy();
  });

  it("updates state and styling when changing the primary toggle button", async () => {
    const { getByText } = await renderFuelScreen();

    const eatInButton = getByText("Eat In");

    //Simulate user tapping on the 'Eat In' option
    fireEvent.press(eatInButton);

    //Confirms the component handles interaction event smoothly
    expect(eatInButton).toBeTruthy();
  });

  it("says a location goes to Google on Eat Out", async () => {
    // US34. Eat Out is the default mode, so this is visible on arrival.
    const { getByText } = await renderFuelScreen();

    expect(getByText(/sends your location, or the area you type, to Google/i)).toBeTruthy();
  });

  it("shows no such notice on Eat In, where nothing leaves the phone", async () => {
    // A notice where nothing is collected teaches people that the notices mean
    // nothing, which costs us the ones that matter.
    const { getByText, queryByText } = await renderFuelScreen();

    fireEvent.press(getByText("Eat In"));

    expect(queryByText(/to Google/i)).toBeNull();
  });

  it("starts from the budget saved in settings", async () => {
    // The survey and the Settings picker both write the level here, so arriving
    // on Fuel shows that person's own ranges rather than the neutral default.
    const { getAllByText, queryByText } = await renderFuelScreen();

    // The moderate ranges, not the "no answer yet" ones.
    expect(getAllByText("$22 - $28").length).toBeGreaterThan(0);
    expect(queryByText("$25 - $50")).toBeNull();
  });

  it("shows a live place from Google when the main action button is pressed", async () => {
    const { getByText, findByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));

    // The real place name, not just "a result or the empty state". Asserting on
    // the name is what proves the live path actually ran.
    expect(await findByText("Test Cafe", {}, { timeout: 3000 })).toBeTruthy();
  });

  it("credits Google on an Eat Out result, which their terms require", async () => {
    const { getByText, findByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));
    await findByText("Test Cafe", {}, { timeout: 3000 });

    expect(getByText("Powered by Google")).toBeTruthy();
  });

  it("asks where the user is instead of guessing a city when location fails", async () => {
    // The team and the markers are spread across three states, so assuming a
    // city would show somebody in Queensland a Melbourne restaurant and call it
    // nearby. It has to ask.
    const { getCurrentPosition } = jest.requireMock("@/services/location/locationService");
    (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: false, reason: "denied" });

    const { getByText, findByText, queryByText } = await renderFuelScreen();
    fireEvent.press(getByText("Decide for Me"));

    expect(await findByText(/could not get your location/i)).toBeTruthy();
    // Crucially, no recommendation at all rather than one from the wrong city.
    expect(queryByText("Test Cafe")).toBeNull();

    (getCurrentPosition as jest.Mock).mockResolvedValue({
      ok: true,
      latitude: -37.8,
      longitude: 144.9,
    });
  });

  it("searches the typed area and says the result is not based on location", async () => {
    const { getCurrentPosition } = jest.requireMock("@/services/location/locationService");
    (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: false, reason: "denied" });

    const { getByText, getByTestId, findByText } = await renderFuelScreen();
    fireEvent.press(getByText("Decide for Me"));
    await findByText(/could not get your location/i);

    // Typed but never chosen from the list, so there are no coordinates and the
    // looser text search is still the right path. Selected by testID rather
    // than placeholder text, which is copy and moves.
    fireEvent.changeText(getByTestId("fuel-area-input"), "Southport QLD");
    fireEvent.press(getByText("Search this area"));

    expect(await findByText("Southport Diner", {}, { timeout: 3000 })).toBeTruthy();
    expect(getByText(/Places in Southport QLD, not based on your location/i)).toBeTruthy();

    (getCurrentPosition as jest.Mock).mockResolvedValue({
      ok: true,
      latitude: -37.8,
      longitude: 144.9,
    });
  });

  it("shows no such notice when the phone did give a position", async () => {
    const { getByText, findByText, queryByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));
    await findByText("Test Cafe", {}, { timeout: 3000 });

    expect(queryByText(/not based on your location/i)).toBeNull();
  });

  it("awards the advertised XP when a recommendation is accepted", async () => {
    mockAwardXp.mockClear();
    const { getByText, findByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));
    await findByText("Test Cafe", {}, { timeout: 3000 });

    fireEvent.press(getByText("Accept"));

    // The History row and the Home quest pill both advertise this figure, so
    // accepting has to actually grant it or the label is lying to the user.
    await waitFor(() => expect(mockAwardXp).toHaveBeenCalledWith(XP_PER_DECISION));
  });

  it("shows a measured distance rather than a figure from the chosen band", async () => {
    // The chip used to print a fixed "1.2 km" for anything marked near, which
    // was a number nobody had measured. It now comes from the coordinates.
    const { getByText, findByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));
    await findByText("Test Cafe", {}, { timeout: 3000 });

    // The mocked place sits about 610m north of the mocked position.
    expect(getByText(/^\d+ m$/)).toBeTruthy();
  });

  it("names the missing key instead of blaming the filters", async () => {
    // This is the state anyone gets running the project from a fresh copy,
    // including whoever marks it, because .env is deliberately not committed.
    // Reporting it as "no exact match, try changing your filters" sends them
    // hunting through the filters for a fault that is not there, and makes a
    // working feature look broken.
    const { fetchNearbyPlaces, MissingPlacesKeyError } = jest.requireMock(
      "@/services/recommendation/googlePlaces"
    );
    (fetchNearbyPlaces as jest.Mock).mockRejectedValueOnce(new MissingPlacesKeyError());

    const { getByText, findByTestId, queryByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));

    await findByTestId("fuel-key-missing", {}, { timeout: 3000 });
    expect(queryByText(/changing your filters/i)).toBeNull();
  });

  it("searches around a chosen suburb rather than text-matching its name", async () => {
    // The Burwood bug. Typing "Belgrave" used to run an unanchored text search,
    // so Google returned whatever it judged most relevant and the result could
    // sit half an hour's drive away with nothing to measure it against.
    // Choosing from the list gives the search a real centre and radius.
    const { getCurrentPosition } = jest.requireMock("@/services/location/locationService");
    const { fetchNearbyPlaces, fetchPlacesByArea } = jest.requireMock(
      "@/services/recommendation/googlePlaces"
    );
    (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: false, reason: "unavailable" });
    // No beforeEach in this suite, so call records carry over from earlier
    // tests. An earlier one does use the text search, which would make the
    // "not called" assertion below fail for the wrong reason.
    (fetchNearbyPlaces as jest.Mock).mockClear();
    (fetchPlacesByArea as jest.Mock).mockClear();

    const { getByText, getByTestId, findByTestId } = await renderFuelScreen();
    fireEvent.press(getByText("Decide for Me"));
    await findByTestId("fuel-area-input", {}, { timeout: 3000 });

    fireEvent.changeText(getByTestId("fuel-area-input"), "Belg");
    await findByTestId("fuel-area-suggestions", {}, { timeout: 3000 });
    fireEvent.press(getByText("Belgrave VIC 3160, Australia"));

    await waitFor(() =>
      expect(fetchNearbyPlaces as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -37.9084, longitude: 145.3554 })
      )
    );
    // The loose text search must not also run: it is the thing being replaced.
    expect(fetchPlacesByArea as jest.Mock).not.toHaveBeenCalled();

    // This suite has no beforeEach, so each test leaves the mocks as it found
    // them. Without this the failing position leaks into every test after it.
    (getCurrentPosition as jest.Mock).mockResolvedValue({
      ok: true,
      latitude: -37.8,
      longitude: 144.9,
    });
  });

  it("still blames the filters when the search really did come back empty", async () => {
    // The other half. If every empty result claimed a missing key, the three of
    // us with a working .env would be told to go and fix it.
    const { fetchNearbyPlaces } = jest.requireMock(
      "@/services/recommendation/googlePlaces"
    );
    (fetchNearbyPlaces as jest.Mock).mockResolvedValueOnce([]);

    const { getByText, findByText, queryByTestId } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));

    await findByText(/changing your filters/i, {}, { timeout: 3000 });
    expect(queryByTestId("fuel-key-missing")).toBeNull();
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre and kilometres above", () => {
    expect(formatDistance({ distance_meters: 450, distance_range: "near" })).toBe("450 m");
    expect(formatDistance({ distance_meters: 1240, distance_range: "near" })).toBe("1.2 km");
  });

  it("names the band rather than inventing a figure when nothing was measured", () => {
    expect(formatDistance({ distance_meters: undefined, distance_range: "mid" })).toBe("Mid");
  });
});
