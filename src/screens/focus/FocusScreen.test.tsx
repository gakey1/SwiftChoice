// Tests for the focus screen. The icon set, navigation, and history layer are
// stubbed so it renders under Jest. These check that the header and both filter
// groups show, and that tapping Find My Spot lands on a result or empty state.

import React from "react";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import { FocusScreen } from "./FocusScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest.
// Her engine now reads the saved Fuel pool, which reaches expo-sqlite through
// fuelPoolStorage. Mocked so this screen test does not pull that chain in: the
// suite otherwise fails to LOAD, with a "Cannot find module 'expo-asset'" error
// that names neither this screen nor the engine. Sixth time this trap has
// appeared (MC-007), and the tell is always the same, a suite count that drops
// rather than a test going red.
jest.mock("@/features/fuel/fuelPoolStorage", () => ({
  getFuelRecommendationPool: jest.fn(async () => []),
}));

jest.mock("@expo/vector-icons", () => ({ Feather: "Feather", MaterialCommunityIcons: "MaterialCommunityIcons" }));

// Mock the useNavigation hook from React Navigation.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

// Mock the history layer so this test does not pull in the SQLite chain
// (historyStorage -> db.ts -> expo-sqlite), which is not resolvable under Jest.
jest.mock("@/features/history/historyStorage", () => ({
  logDecision: jest.fn(),
}));

// The engine reads the saved pool now, which reaches expo-sqlite and is not
// resolvable under Jest. This stands in with a small pool that keeps the two
// properties these tests rely on: medium plus collaborative resolves to exactly
// one spot and it is outdoor, and high plus silent resolves to an indoor one.
//
// The names deliberately appear nowhere in the engine's built-in fallback list.
// Reusing a real name would let these tests pass against either source, which is
// exactly the bug the pool wiring was meant to remove.
jest.mock("@/features/focus/focusPoolStorage", () => ({
  getFocusRecommendationPool: jest.fn(async () => [
    { id: 1, name: "Saved Courtyard Table", energy: "medium", vibe: "collaborative", outdoor: true, icon: "wind" },
    { id: 2, name: "Saved Basement Carrel", energy: "high", vibe: "silent", outdoor: false, icon: "book-open" },
    { id: 3, name: "Saved Corner Cafe", energy: "medium", vibe: "background", outdoor: false, icon: "coffee" },
    // A second medium and background spot, so that pairing has something to
    // reroll to. With one match the reroll button does nothing by design.
    { id: 4, name: "Saved Reading Nook", energy: "medium", vibe: "background", outdoor: false, icon: "book" },
  ]),
}));

// The conditions strip depends on the device position and the weather lookup.
// Both are stubbed so each case below controls exactly one of them. Note that
// outdoorAdvice is deliberately NOT mocked: the wording it produces is what the
// user reads, so these assert against the real sentences.
jest.mock("@/services/location/locationService", () => ({
  getCurrentPosition: jest.fn(async () => ({ ok: true, latitude: -37.8, longitude: 144.9 })),
}));
jest.mock("@/services/weather/weatherService", () => ({
  RAIN_LIKELY_PERCENT: 50,
  getOutdoorConditions: jest.fn(),
}));

const { getCurrentPosition } = jest.requireMock("@/services/location/locationService");
const { getOutdoorConditions } = jest.requireMock("@/services/weather/weatherService");

// A mild, dry day. Each test overrides only the field it is about.
function conditions(overrides: Record<string, number | boolean> = {}) {
  return {
    ok: true,
    temperatureC: 20,
    feelsLikeC: 20,
    rainChancePercent: 5,
    rainLikely: false,
    weatherCode: 0,
    windKph: 8,
    ...overrides,
  };
}

// Medium plus Collaborative matches exactly one spot in the pool, the outdoor
// Campus Common Area. Chosen because the engine shuffles its matches, so a
// combination with several results would pick a different spot each run.
async function findOutdoorSpot(utils: ReturnType<typeof render>) {
  // Energy already defaults to Medium, and pressing it would be ambiguous
  // because the chosen value is echoed in the group header as well.
  fireEvent.press(utils.getByText("Collaborative"));
  fireEvent.press(utils.getByText("Find My Spot"));
  // The pool read is async now, so the result arrives a tick after the press.
  await waitFor(() => expect(utils.getByText("Saved Courtyard Table")).toBeTruthy());
  await act(async () => { });
  return utils;
}

beforeEach(() => {
  (getCurrentPosition as jest.Mock).mockClear();
  (getOutdoorConditions as jest.Mock).mockClear();
  (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: true, latitude: -37.8, longitude: 144.9 });
  (getOutdoorConditions as jest.Mock).mockResolvedValue(conditions());
});

describe("FocusScreen", () => {
  it("renders the header and both filter groups", () => {
    const { getByText } = render(<FocusScreen />);

    // Verify the core input layout renders safely.
    expect(getByText("Focus")).toBeTruthy();
    expect(getByText("Where should you study or work?")).toBeTruthy();
    expect(getByText("Energy")).toBeTruthy();
    expect(getByText("Vibe")).toBeTruthy();
  });

  it("resolves to a recommendation or empty state after tapping Find My Spot", async () => {
    const { getByText } = render(<FocusScreen />);

    // Trigger the choice engine with the default energy/vibe selection.
    fireEvent.press(getByText("Find My Spot"));

    // The flow lands on either the result view or the no-match message.
    await waitFor(() =>
      expect(getByText(/Your Focus recommendation|No exact focus spot found/i)).toBeTruthy()
    );
  });

  it("recommends a spot that came from the saved pool, not a list in the code", async () => {
    // The pool is stubbed above with names that are its own, so a result here
    // can only have come through the storage layer.
    const utils = render(<FocusScreen />);
    fireEvent.press(utils.getByText("High"));
    fireEvent.press(utils.getByText("Silent"));
    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() => expect(utils.getByText("Saved Basement Carrel")).toBeTruthy());
  });

  it("shows no rating chip, since neither the pool nor the proposal has ratings", async () => {
    // The old built-in list carried hand-written ratings. Showing one for a spot
    // that has none would be a number we invented.
    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText("Rating")).toBeNull();
  });

  it("draws the icon stored on the spot, not one icon for the whole module", async () => {
    // The card used to show the Focus module glyph, which made every result look
    // identical while telling you something the header and the colour already
    // said twice.
    //
    // Asserting the icon name, not the spoken label. The label reads correctly
    // even if every spot draws the same picture, so a label-only test passes
    // against exactly the bug this fixes.
    //
    // The stub uses icons nothing else on the card draws. "sun" would match
    // three nodes here, since the weather strip and the Setting chip use it too.
    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.UNSAFE_getByProps({ name: "wind" })).toBeTruthy();
  });

  it("draws a different icon for a different spot", async () => {
    // One icon proves an icon. Two prove it follows the spot.
    const utils = render(<FocusScreen />);
    fireEvent.press(utils.getByText("High"));
    fireEvent.press(utils.getByText("Silent"));
    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() => expect(utils.UNSAFE_getByProps({ name: "book-open" })).toBeTruthy());
    expect(utils.UNSAFE_queryByProps({ name: "wind" })).toBeNull();
  });

  it("acknowledges a reroll, since the card swaps in place", async () => {
    // Without it the only sign anything happened is that the name changed,
    // which is easy to miss on a card that does not otherwise move.
    // Medium and Background are the defaults, so no filter press is needed.
    const utils = render(<FocusScreen />);
    fireEvent.press(utils.getByText("Find My Spot"));
    await waitFor(() => expect(utils.getByText("Reroll")).toBeTruthy());

    expect(utils.queryByText("Reroll used")).toBeNull();

    fireEvent.press(utils.getByText("Reroll"));

    expect(utils.getByText("Reroll used")).toBeTruthy();
  });

  // Shows the reroll allowance clearly before and after the alternative is used,
  // so the user is not expected to infer the limit from a disabled button.
  it("shows the remaining reroll allowance", async () => {
    const utils = render(<FocusScreen />);

    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() =>
      expect(utils.getByText("1 reroll remaining")).toBeTruthy()
    );

    fireEvent.press(utils.getByText("Reroll"));

    expect(utils.getByText("0 rerolls remaining")).toBeTruthy();
    expect(utils.getByText("No rerolls left")).toBeTruthy();
  });

  // After using the one reroll, the user can return to the first recommendation
  // without restoring another reroll.
  it("returns to the previous recommendation after rerolling", async () => {
    const utils = render(<FocusScreen />);

    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() => expect(utils.getByText("Reroll")).toBeTruthy());

    const firstRecommendation = utils.getByText(/Saved (Corner Cafe|Reading Nook)/).props
      .children;

    fireEvent.press(utils.getByText("Reroll"));

    await waitFor(() =>
      expect(utils.getByText("Previous recommendation")).toBeTruthy()
    );

    fireEvent.press(utils.getByText("Previous recommendation"));

    expect(utils.getByText(firstRecommendation)).toBeTruthy();
    expect(utils.getByText("0 rerolls remaining")).toBeTruthy();
  });

  // When the chosen filters produce only one matching spot, the screen explains
  // that there is no alternative and gives the user a direct way back to the
  // filters instead of leaving a disabled reroll button with no explanation.
  it("offers Adjust filters when there is no alternative recommendation", async () => {
    const utils = render(<FocusScreen />);

    fireEvent.press(utils.getByText("Collaborative"));
    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() =>
      expect(utils.getByText("Saved Courtyard Table")).toBeTruthy()
    );

    expect(utils.getByText("No more matches for these filters.")).toBeTruthy();
    expect(utils.getByText("Adjust filters")).toBeTruthy();

    fireEvent.press(utils.getByText("Adjust filters"));

    expect(utils.getByText("Find My Spot")).toBeTruthy();
    expect(utils.queryByText("Saved Courtyard Table")).toBeNull();
  });

  it("says whether the spot is indoors or outdoors, which is stored on every spot", async () => {
    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.getByText("Setting")).toBeTruthy();
    expect(utils.getByText("Outdoor")).toBeTruthy();
  });

  it("says Indoor for an indoor spot, so the chip is never blank", async () => {
    // The chip it replaced was empty for every saved spot. This one cannot be.
    const utils = render(<FocusScreen />);
    fireEvent.press(utils.getByText("High"));
    fireEvent.press(utils.getByText("Silent"));
    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() => expect(utils.getByText("Indoor")).toBeTruthy());
  });

  it("says a location goes to a weather service, before anything is searched", async () => {
    // US34. The notice has to be readable before the control is used, not after
    // the collection has already happened.
    const { getByText } = render(<FocusScreen />);

    expect(getByText(/Your location goes to a weather service/i)).toBeTruthy();
  });

  // US34. Focus only shares the user's location when the recommended spot is
  // outdoors, because indoor spots do not need a weather lookup.
  it("states that weather location sharing only applies to outdoor spots", () => {
    const { getByText } = render(<FocusScreen />);

    expect(
      getByText(/For outdoor spots, we check the weather using your current location/i)
    ).toBeTruthy();
  });

  it("warns about rain on an outdoor spot when rain is likely", async () => {
    (getOutdoorConditions as jest.Mock).mockResolvedValue(
      conditions({ rainLikely: true, rainChancePercent: 80, weatherCode: 61 })
    );

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    await waitFor(() => expect(utils.getByText(/Take an umbrella/i)).toBeTruthy());
  });

  it("still shows the conditions on a dry day, which is the whole point of the change", async () => {
    // The old version showed nothing unless rain was likely, so the feature was
    // invisible almost every time an outdoor spot came up and could not be
    // demonstrated on purpose. A dry day must still say something true.
    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    await waitFor(() => expect(utils.getByText(/20 degrees/i)).toBeTruthy());
    expect(utils.getByText(/Good conditions for working outside/i)).toBeTruthy();
    expect(utils.queryByText(/umbrella/i)).toBeNull();
  });

  it("advises a jacket when it feels cold, whatever the thermometer says", async () => {
    (getOutdoorConditions as jest.Mock).mockResolvedValue(
      conditions({ temperatureC: 16, feelsLikeC: 8, weatherCode: 3 })
    );

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    await waitFor(() => expect(utils.getByText(/Take a jacket/i)).toBeTruthy());
  });

  it("shows nothing when the conditions cannot be reached", async () => {
    // A reading we could not get must not become a claim we invent.
    (getOutdoorConditions as jest.Mock).mockResolvedValue({ ok: false, reason: "unavailable" });

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText(/degrees/i)).toBeNull();
  });

  it("does not request location for an indoor spot", async () => {
    const utils = render(<FocusScreen />);

    fireEvent.press(utils.getByText("High"));
    fireEvent.press(utils.getByText("Silent"));
    fireEvent.press(utils.getByText("Find My Spot"));

    await waitFor(() => expect(utils.getByText("Saved Basement Carrel")).toBeTruthy());
    await act(async () => { });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getOutdoorConditions).not.toHaveBeenCalled();
  });

  it("shows nothing when the phone will not give a position", async () => {
    (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: false, reason: "denied" });

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText(/degrees/i)).toBeNull();
  });
});
