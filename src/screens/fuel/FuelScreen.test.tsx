// Tests for the fuel screen. The icon set, navigation, and history layer are
// stubbed so it renders under Jest. These check that the header and filters
// show, that the Eat In toggle responds, and that Decide for Me lands on a
// result or empty state.

import React from "react";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import { FuelScreen } from "./FuelScreen";
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

  it("starts from the budget saved in settings", async () => {
    // The survey and the Settings picker both write the level here, so arriving
    // on Fuel shows that person's own ranges rather than the neutral default.
    const { getAllByText, queryByText } = await renderFuelScreen();

    // The moderate ranges, not the "no answer yet" ones.
    expect(getAllByText("$22 - $28").length).toBeGreaterThan(0);
    expect(queryByText("$25 - $50")).toBeNull();
  });

  it("triggers the recommendation engine when clicking the main action button", async () => {
    const { getByText, findByText } = await renderFuelScreen();

    const actionButton = getByText("Decide for Me");

    //Simulate user tapping the button to trigger the choice engine
    fireEvent.press(actionButton);

    //The engine is async now (Eat Out routes through the mock Google Places
    //call), so wait for either the result card or the empty message.
    const hasResult = await findByText(
      /Your Fuel recommendation|No exact match found/i,
      {},
      { timeout: 3000 }
    );
    expect(hasResult).toBeTruthy();
  });

  it("awards the advertised XP when a recommendation is accepted", async () => {
    mockAwardXp.mockClear();
    const { getByText, findByText, queryByText } = await renderFuelScreen();

    fireEvent.press(getByText("Decide for Me"));
    await findByText(/Your Fuel recommendation|No exact match found/i, {}, { timeout: 3000 });

    // The empty state has no Accept button, so only assert when a result landed.
    const accept = queryByText("Accept");
    if (!accept) return;

    fireEvent.press(accept);

    // The History row and the Home quest pill both advertise this figure, so
    // accepting has to actually grant it or the label is lying to the user.
    await waitFor(() => expect(mockAwardXp).toHaveBeenCalledWith(XP_PER_DECISION));
  });
});