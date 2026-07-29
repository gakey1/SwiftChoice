// Tests for the History dashboard. The icon set, navigation and the history layer
// are stubbed so the screen renders under Jest. These check the level card, the
// recent-decisions empty state, and that an accepted decision shows in the
// recent list with its module and name.

import { render, screen } from "@testing-library/react-native";

import { HistoryScreen } from "./HistoryScreen";

const fuelDecision = {
  historyId: "dh_fuel",
  moduleType: "fuel" as const,
  fuelId: "in_4",
  focusId: null,
  taskId: null,
  itemSnapshot: { name: "Gourmet Homemade Pasta", details: {} },
  appliedFilters: {},
  rerolled: false,
  decidedAt: "2026-07-05T02:15:00.000Z",
};

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Metro resolves them fine for the app.
jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

// Run the focus-effect callback once on mount, like a plain effect, so the screen
// loads its data under test.
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const actualReact = jest.requireActual("react");
    actualReact.useEffect(cb, []);
  },
}));

// Mock the history layer so this test does not pull in the SQLite chain
// (historyStorage -> db.ts -> expo-sqlite), which is not resolvable under Jest.
const mockGetDecisions = jest.fn();
jest.mock("@/features/history/historyStorage", () => ({
  getDecisions: () => mockGetDecisions(),
}));

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the header and the level card", async () => {
    mockGetDecisions.mockResolvedValue([]);

    render(<HistoryScreen />);

    expect(await screen.findByText("Your mental-energy dashboard", {}, { timeout: 3000 })).toBeTruthy();
    // A fresh player is level 1 with the Rookie title.
    expect(screen.getByText("LEVEL")).toBeTruthy();
    expect(screen.getByText("Rookie")).toBeTruthy();
  });

  it("shows the recent empty state when there are no decisions", async () => {
    mockGetDecisions.mockResolvedValue([]);

    render(<HistoryScreen />);

    expect(await screen.findByText("No decisions yet", {}, { timeout: 3000 })).toBeTruthy();
  });

  it("lists an accepted decision with its module and name", async () => {
    mockGetDecisions.mockResolvedValue([fuelDecision]);

    render(<HistoryScreen />);

    expect(
      await screen.findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 })
    ).toBeTruthy();
    // The meta line reads "Fuel · 5 Jul, ...".
    expect(screen.getByText(/Fuel ·/)).toBeTruthy();
  });
});
