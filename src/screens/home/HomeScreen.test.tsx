// Tests for the home screen. The icon set and navigation are stubbed so it
// renders under Jest. These check that the greeting and the three module cards
// show, and that the weekly snapshot shows its empty state.

import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "@/screens/home/HomeScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset,
// which are not resolvable under Jest. Metro resolves them fine for the app.
jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));
// HomeScreen calls useNavigation to open a module, and useFocusEffect to reload
// its data. Stub both so the component renders without a real NavigationContainer;
// useFocusEffect just runs its callback once.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
}));

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
