import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "@/screens/home/HomeScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Metro resolves them fine for the app.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather" }));
// HomeScreen now calls useNavigation to open the Fuel screen; stub it so the
// component renders without a real NavigationContainer.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
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
