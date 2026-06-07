import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { logout } from "@/services/auth";

jest.mock("@/services/auth", () => ({ logout: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
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
