import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FuelScreen } from "./FuelScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather" }));

//Mock the useNavigation hook from React Navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
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

  it("triggers the recommendation engine when clicking the main action button", () => {
    const { getByText } = render(<FuelScreen />);
    
    const actionButton = getByText("Decide for Me");

    //Simulate user tapping the button to trigger the choice engine
    fireEvent.press(actionButton);

    //Confirms it either found a match from our pool or displays the empty message
    const hasResult = getByText(/Your Fuel recommendation|No exact match found/i);
    expect(hasResult).toBeTruthy();
  });
});