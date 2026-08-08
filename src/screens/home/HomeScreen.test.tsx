// Tests for the home screen. The icon set and navigation are stubbed so it
// renders under Jest. These check that the greeting and the three module cards
// show, and that the weekly snapshot shows its empty state.

import { fireEvent, render, screen } from "@testing-library/react-native";

import { HomeScreen } from "@/screens/home/HomeScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Metro resolves them fine for the app.
jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));
// HomeScreen calls useNavigation to open a module or switch tab, and
// useFocusEffect to reload its data. Stub both so the component renders without
// a real NavigationContainer.
//
// useFocusEffect is run through useEffect rather than called directly. The real
// one runs after the commit, and calling it during render instead turns any
// setState inside it into a render-phase update, which React aborts as an
// infinite loop. That is a fault in the stub rather than in the screen.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

const mockNavigate = jest.fn();

// The THIS WEEK card reads the decision history; stub it so the test does not
// pull in the SQLite chain and starts from an empty (no decisions) state.
jest.mock("@/features/history/historyStorage", () => ({
  getDecisions: jest.fn().mockResolvedValue([]),
}));

describe("HomeScreen", () => {
  it("renders the greeting and the three module cards", () => {
    render(<HomeScreen />);

    expect(screen.getByText(/what decision can I help with/i)).toBeTruthy();
    expect(screen.getByText("Fuel")).toBeTruthy();
    expect(screen.getByText("Focus")).toBeTruthy();
    expect(screen.getByText("Priority")).toBeTruthy();
  });

  it("shows the weekly snapshot empty-state instead of placeholder figures", () => {
    render(<HomeScreen />);

    expect(screen.getByText(/no decisions yet this week/i)).toBeTruthy();
  });
});

describe("HomeScreen greeting", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function renderAt(isoLocalHour: number) {
    jest.useFakeTimers();
    const when = new Date();
    when.setHours(isoLocalHour, 0, 0, 0);
    jest.setSystemTime(when);
    render(<HomeScreen />);
  }

  it("says good morning in the morning", () => {
    renderAt(9);
    expect(screen.getByText(/Good morning!/)).toBeTruthy();
  });

  it("says good afternoon in the afternoon", () => {
    renderAt(14);
    expect(screen.getByText(/Good afternoon!/)).toBeTruthy();
  });

  it("does not wish you good morning at night", () => {
    // The actual reported bug: the greeting was typed into the mockup and
    // shipped literally, so the app said "Good morning" at eleven at night.
    renderAt(23);
    expect(screen.queryByText(/Good morning!/)).toBeNull();
    expect(screen.getByText(/Good evening!/)).toBeTruthy();
  });
});

describe("HomeScreen profile avatar", () => {
  it("opens Settings when the avatar is tapped", () => {
    // Where the avatar is changed, and the first place people try. The design
    // wires the same tap.
    render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText("Edit profile"));

    expect(mockNavigate).toHaveBeenCalledWith("settings");
  });
});

describe("HomeScreen week stats", () => {
  it("does not show an All time column", async () => {
    // It was never in the design. The design's three are Decisions, Avg. saved
    // and Reroll rate.
    const { getDecisions } = jest.requireMock("@/features/history/historyStorage");
    getDecisions.mockResolvedValue([
      {
        historyId: "d1",
        moduleType: "fuel",
        fuelId: null,
        focusId: null,
        taskId: null,
        itemSnapshot: { name: "Pasta", details: {} },
        appliedFilters: {},
        rerolled: false,
        decidedAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 30_000).toISOString(),
      },
    ]);

    render(<HomeScreen />);

    expect(await screen.findByText("Avg. saved")).toBeTruthy();
    expect(screen.queryByText("All time")).toBeNull();
  });

  it("subtracts the measured time from the assumed baseline", async () => {
    const { getDecisions } = jest.requireMock("@/features/history/historyStorage");
    const now = Date.now();
    getDecisions.mockResolvedValue([
      {
        historyId: "d1",
        moduleType: "fuel",
        fuelId: null,
        focusId: null,
        taskId: null,
        itemSnapshot: { name: "Pasta", details: {} },
        appliedFilters: {},
        rerolled: false,
        decidedAt: new Date(now).toISOString(),
        startedAt: new Date(now - 40_000).toISOString(),
      },
    ]);

    render(<HomeScreen />);

    // 8 minute baseline minus the 40 seconds actually taken.
    expect(await screen.findByText("7min")).toBeTruthy();
  });

  it("shows a dash when no decision recorded a start", async () => {
    // Only reachable for decisions saved before starts were recorded. A figure
    // there would claim a saving against a time nobody measured.
    const { getDecisions } = jest.requireMock("@/features/history/historyStorage");
    getDecisions.mockResolvedValue([
      {
        historyId: "d1",
        moduleType: "fuel",
        fuelId: null,
        focusId: null,
        taskId: null,
        itemSnapshot: { name: "Pasta", details: {} },
        appliedFilters: {},
        rerolled: false,
        decidedAt: new Date().toISOString(),
        startedAt: null,
      },
    ]);

    render(<HomeScreen />);

    expect(await screen.findByText("-")).toBeTruthy();
  });
});
