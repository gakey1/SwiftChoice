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

// The rain warning depends on the device position and the forecast. Both are
// stubbed so each case below controls exactly one of them.
jest.mock("@/services/location/locationService", () => ({
  getCurrentPosition: jest.fn(async () => ({ ok: true, latitude: -37.8, longitude: 144.9 })),
}));
jest.mock("@/services/weather/weatherService", () => ({
  RAIN_LIKELY_PERCENT: 50,
  getRainForecast: jest.fn(async () => ({ ok: true, rainLikely: true, probabilityPercent: 80 })),
}));

const { getCurrentPosition } = jest.requireMock("@/services/location/locationService");
const { getRainForecast } = jest.requireMock("@/services/weather/weatherService");

// Medium plus Collaborative matches exactly one spot in the pool, the outdoor
// Campus Common Area. Chosen because the engine shuffles its matches, so a
// combination with several results would pick a different spot each run.
async function findOutdoorSpot(utils: ReturnType<typeof render>) {
  // Energy already defaults to Medium, and pressing it would be ambiguous
  // because the chosen value is echoed in the group header as well.
  fireEvent.press(utils.getByText("Collaborative"));
  fireEvent.press(utils.getByText("Find My Spot"));
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: true, latitude: -37.8, longitude: 144.9 });
  (getRainForecast as jest.Mock).mockResolvedValue({ ok: true, rainLikely: true, probabilityPercent: 80 });
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

  it("resolves to a recommendation or empty state after tapping Find My Spot", () => {
    const { getByText } = render(<FocusScreen />);

    // Trigger the choice engine with the default energy/vibe selection.
    fireEvent.press(getByText("Find My Spot"));

    // The flow lands on either the result view or the no-match message.
    const outcome = getByText(/Your Focus recommendation|No exact focus spot found/i);
    expect(outcome).toBeTruthy();
  });

  it("warns about rain on an outdoor spot when rain is likely", async () => {
    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    await waitFor(() => expect(utils.getByText(/Rain likely in the next hour/i)).toBeTruthy());
  });

  it("shows no warning when rain is not likely", async () => {
    (getRainForecast as jest.Mock).mockResolvedValue({ ok: true, rainLikely: false, probabilityPercent: 5 });

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText(/Rain likely in the next hour/i)).toBeNull();
  });

  it("shows no warning when the forecast cannot be reached", async () => {
    // A forecast we could not get must not become a warning we invent.
    (getRainForecast as jest.Mock).mockResolvedValue({ ok: false, reason: "unavailable" });

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText(/Rain likely in the next hour/i)).toBeNull();
  });

  it("does not even ask for a forecast when the spot is indoors", async () => {
    // Rain is irrelevant to a library desk, and the call would be wasted.
    (getRainForecast as jest.Mock).mockClear();

    const utils = render(<FocusScreen />);
    fireEvent.press(utils.getByText("High"));
    fireEvent.press(utils.getByText("Silent"));
    fireEvent.press(utils.getByText("Find My Spot"));
    await act(async () => {});

    expect(getRainForecast).not.toHaveBeenCalled();
    expect(utils.queryByText(/Rain likely in the next hour/i)).toBeNull();
  });

  it("shows no warning when the phone will not give a position", async () => {
    (getCurrentPosition as jest.Mock).mockResolvedValue({ ok: false, reason: "denied" });

    const utils = render(<FocusScreen />);
    await findOutdoorSpot(utils);

    expect(utils.queryByText(/Rain likely in the next hour/i)).toBeNull();
  });
});
