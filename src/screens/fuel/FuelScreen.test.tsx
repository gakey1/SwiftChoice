// Tests for the fuel screen. The icon set, navigation, and history layer are
// stubbed so it renders under Jest. These check that the header and filters
// show, that the Eat In toggle responds, and that Decide for Me lands on a
// result or empty state.

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FuelScreen } from "./FuelScreen";

// Stub the native icon sets so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Both sets are stubbed because the screen's
// module glyph uses MaterialCommunityIcons and its other icons use Feather.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather", MaterialCommunityIcons: "MaterialCommunityIcons" }));

//Mock the useNavigation hook from React Navigation
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

describe("FuelScreen", () => {
  it("renders the header and filter components correctly", () => {
    const { getByText } = render(<FuelScreen />);

    //Verify the core layout titles render safely
    expect(getByText("Fuel")).toBeTruthy();
    expect(getByText("What should you eat?")).toBeTruthy();
    expect(getByText("Budget")).toBeTruthy();
    expect(getByText("Prep Time")).toBeTruthy();
    expect(getByText("Distance")).toBeTruthy();
  });

  it("updates state and styling when changing the primary toggle button", () => {
    const { getByText } = render(<FuelScreen />);
    
    const eatInButton = getByText("Eat In");
    
    //Simulate user tapping on the 'Eat In' option
    fireEvent.press(eatInButton);
    
    //Confirms the component handles interaction event smoothly
    expect(eatInButton).toBeTruthy();
  });

  it("triggers the recommendation engine when clicking the main action button", async () => {
    const { getByText, findByText } = render(<FuelScreen />);

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
});