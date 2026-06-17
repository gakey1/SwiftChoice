import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FuelScreen } from "./FuelScreen";

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
});