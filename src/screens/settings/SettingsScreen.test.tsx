// Tests for the settings screen. The auth hook, logout, icons, and preferences
// storage are all mocked, so this checks the screen's own behaviour: pressing
// Log out calls the logout service.

import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { logout } from "@/services/auth";

// Fake the auth state and the things the screen depends on, so it renders and
// behaves under Jest without real Firebase or a database.
jest.mock("@/services/auth", () => ({ logout: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));
jest.mock("@/components/Icon", () => ({ Icon: () => null }));

// The on-device wipe is mocked so the screen test covers the wiring and the
// wording, not the storage layer, which has its own tests.
jest.mock("@/features/privacy/localData", () => ({
  clearLocalData: jest.fn().mockResolvedValue({ ok: true, failed: [] }),
}));

// The screen mirrors the chosen budget onto the user's profile. Mocked so the
// test does not pull the real Firestore client in through this module.
jest.mock("@/services/firestore/users", () => ({
  isBudgetTier: (value: unknown) =>
    value === "budget" || value === "moderate" || value === "premium",
  saveBudgetTier: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/services/localdb/preferencesStorage", () => ({
  loadPreferences: jest.fn().mockResolvedValue({
    dietaryRestrictions: "None set",
    defaultBudget: "$20 - $50",
    workHours: "9am - 5pm",
  }),
  savePreferences: jest.fn().mockResolvedValue(undefined),
}));

// The screen now reads the active theme via useTheme(), so it must render inside
// a ThemeProvider. Mock the theme storage so it hydrates deterministically.
jest.mock("@/services/localdb/themeStorage", () => ({
  loadThemeName: jest.fn().mockResolvedValue("arcadeDark"),
  saveThemeName: jest.fn(),
}));

const mockLogout = logout as jest.Mock;

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls logout when Log out is pressed", async () => {
    mockLogout.mockResolvedValue(undefined);
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByText("Log out"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it("offers to clear on-device data and says the account is not affected", async () => {
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    // The wording is the point. Somebody must not read this as deleting
    // everything, because the cloud copy of their history survives it.
    expect(await screen.findByText("Clear data on this phone")).toBeTruthy();
    expect(
      screen.getByText(/history already\s+saved to your account is not affected/i)
    ).toBeTruthy();
  });

  it("asks before clearing rather than doing it on the first tap", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { clearLocalData } = jest.requireMock("@/features/privacy/localData");

    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByText("Clear data on this phone"));

    expect(alertSpy).toHaveBeenCalled();
    // Nothing is wiped until the confirmation is accepted.
    expect(clearLocalData).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
