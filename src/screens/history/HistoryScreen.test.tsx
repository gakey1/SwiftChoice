import React from "react";
import { render } from "@testing-library/react-native";

import { HistoryScreen } from "./HistoryScreen";

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

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the empty state when there are no decisions", async () => {
    mockGetDecisions.mockResolvedValue([]);

    const { findByText } = render(<HistoryScreen />);

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

    const { findByText } = render(<HistoryScreen />);

    expect(
      await findByText("Gourmet Homemade Pasta", {}, { timeout: 3000 })
    ).toBeTruthy();
    expect(await findByText(/Fuel/)).toBeTruthy();
  });
});
