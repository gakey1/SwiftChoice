import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FocusScreen } from "./FocusScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather" }));

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
});
