// Tests for the settings screen. The auth hook, logout, icons, and preferences
// storage are all mocked, so this checks the screen's own behaviour: pressing
// Log out calls the logout service.

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { logout } from "@/services/auth";

// Fake the auth state and the things the screen depends on, so it renders and
// behaves under Jest without real Firebase or a database.
jest.mock("@/services/auth", () => ({ logout: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));
jest.mock("@/components/Icon", () => ({ Icon: () => null }));
jest.mock("@/services/localdb/preferencesStorage", () => ({
  loadPreferences: jest.fn().mockResolvedValue({
    dietaryRestrictions: "None set",
    defaultBudget: "$20 - $50",
    workHours: "9am - 5pm",
  }),
  savePreferences: jest.fn().mockResolvedValue(undefined),
}));

const mockLogout = logout as jest.Mock;

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls logout when Log out is pressed", async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Log out"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
