// Tests for the history screen. Navigation and the history layer are mocked, so
// these check the screen's own behaviour: it shows the empty state when there is
// nothing, and lists a decision with its module and name when there is one.

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { HistoryScreen } from "./HistoryScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";

// Reusable decision fixtures. Item names are unique so a query by name targets a
// list row, not the module label in the meta line or a filter chip.
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

const focusDecision = {
  historyId: "dh_focus",
  moduleType: "focus" as const,
  fuelId: null,
  focusId: "focus_5",
  taskId: null,
  itemSnapshot: { name: "Cafe With Soft Music", details: {} },
  appliedFilters: {},
  rerolled: false,
  decidedAt: "2026-07-05T03:00:00.000Z",
};

// Run the focus-effect callback once on mount, like a plain effect, so the
// screen loads its data under test.
jest.mock("@react-navigation/native", () => {
  const actualReact = jest.requireActual("react");
  return {
    useFocusEffect: (cb: () => void | (() => void)) => actualReact.useEffect(cb, []),
  };
});

// Mock the history layer so this test does not pull in the SQLite chain
// (historyStorage -> db.ts -> expo-sqlite), which is not resolvable under Jest.
const mockGetDecisions = jest.fn();
jest.mock("@/features/history/historyStorage", () => ({
  getDecisions: () => mockGetDecisions(),
}));

// The screen reads the active theme via useTheme(), so it must render inside a
// ThemeProvider. Mock the theme's storage so the provider hydrates deterministically
// and never touches AsyncStorage under the test.
jest.mock("@/services/localdb/themeStorage", () => ({
  loadThemeName: jest.fn().mockResolvedValue("arcadeDark"),
  saveThemeName: jest.fn(),
}));

// Renders the screen wrapped in the ThemeProvider it now depends on.
const renderScreen = () =>
  render(
    <ThemeProvider>
      <HistoryScreen />
    </ThemeProvider>
  );

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the empty state when there are no decisions", async () => {
    mockGetDecisions.mockResolvedValue([]);

    const { findByText } = renderScreen();

    // Generous timeout: the load is async, and the default 1s can be tight under
    // parallel test runs.
    expect(await findByText("No decisions yet", {}, { timeout: 3000 })).toBeTruthy();
  });

  it("lists accepted decisions with their module and name", async () => {
    mockGetDecisions.mockResolvedValue([
      {
        historyId: "dh_1",
        moduleType: "fuel",
        fuelId: "in_4",
        focusId: null,
        taskId: null,
        itemSnapshot: { name: "Gourmet Homemade Pasta", details: {} },
        appliedFilters: {},
        rerolled: false,
        decidedAt: "2026-07-05T02:15:00.000Z",
      },
    ]);

    const { findByText } = renderScreen();

    expect(
      await findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 })
    ).toBeTruthy();
    // Match the meta line ("Fuel · 5 Jul, ...") specifically, not the new "Fuel"
    // filter chip, which also carries that word.
    expect(await findByText(/Fuel ·/)).toBeTruthy();
  });

  it("filters the list by module", async () => {
    mockGetDecisions.mockResolvedValue([fuelDecision, focusDecision]);

    const { findByText, getByRole, queryByText } = renderScreen();

    // Both are shown under the default "All" filter.
    await findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 });
    expect(queryByText("Cafe With Soft Music")).toBeTruthy();

    // Tapping the Focus module chip leaves only the focus decision.
    fireEvent.press(getByRole("radio", { name: "Focus" }));

    expect(queryByText("Gourmet Homemade Pasta")).toBeNull();
    expect(queryByText("Cafe With Soft Music")).toBeTruthy();
  });

  it("shows a filtered-empty message when nothing matches", async () => {
    mockGetDecisions.mockResolvedValue([fuelDecision]);

    const { findByText, getByRole } = renderScreen();

    await findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 });

    // Filter to a module with no decisions.
    fireEvent.press(getByRole("radio", { name: "Priority" }));

    expect(await findByText("No decisions match these filters.")).toBeTruthy();
  });

  it("filters by time (an old decision is hidden by Today)", async () => {
    // Dated in 2020, so it is never today and never within the last week,
    // whenever the test runs.
    mockGetDecisions.mockResolvedValue([
      { ...fuelDecision, decidedAt: "2020-01-01T00:00:00.000Z" },
    ]);

    const { findByText, getByRole } = renderScreen();

    await findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 });

    fireEvent.press(getByRole("radio", { name: "Today" }));

    expect(await findByText("No decisions match these filters.")).toBeTruthy();
  });
});
