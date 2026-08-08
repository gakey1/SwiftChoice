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

// The Security row routes to the 2FA screen on the parent stack, so the screen
// now asks for a navigation object. Faked here rather than wrapping the test in
// a real NavigationContainer, which would pull the whole navigator in.
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // Runs the effect once on mount, which is enough for a screen that is
  // rendered and never re-focused within a test.
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

// The keychain is unavailable under Jest, so the enrolment lookup behind the
// Security row is mocked. Its own behaviour is covered in totpStorage.test.ts.
jest.mock("@/services/localdb/totpStorage", () => ({
  isTotpEnrolled: jest.fn().mockResolvedValue(false),
}));

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
    // everything, because the cloud copy of their history survives it. That
    // sentence now lives only in the confirmation, which is the copy that is
    // actually read, so this checks the screen does NOT repeat it inline.
    expect(await screen.findByText("Clear Local Data")).toBeTruthy();
    expect(
      screen.queryByText(/history already\s+saved to your account is not affected/i)
    ).toBeNull();

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    fireEvent.press(screen.getByText("Clear Local Data"));
    // The reassurance has to survive somewhere, and the confirmation is where.
    expect(String(alertSpy.mock.calls[0]?.[1])).toMatch(
      /history already saved to your account is not affected/i
    );
    alertSpy.mockRestore();
  });

  it("opens the data and privacy screen from Your data", async () => {
    // US34 asks for the collection notices to be reachable in one place, not
    // only scattered next to the controls that cause them.
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByText("What we collect"));

    expect(mockNavigate).toHaveBeenCalledWith("DataAndPrivacy");
  });

  it("asks before clearing rather than doing it on the first tap", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { clearLocalData } = jest.requireMock("@/features/privacy/localData");

    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByText("Clear Local Data"));

    expect(alertSpy).toHaveBeenCalled();
    // Nothing is wiped until the confirmation is accepted.
    expect(clearLocalData).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("shows the profile summary above the avatar picker", async () => {
    // The design puts a summary of who you are between the heading and the
    // picker. The app went straight from one to the other, so the screen opened
    // by offering to change your look before saying whose it was.
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    expect(await screen.findByTestId("settings-profile")).toBeTruthy();
    // Level and title, matching what Home already shows for the same player.
    expect(screen.getByText(/Lv 1/)).toBeTruthy();
  });

  it("counts what it can actually count rather than claiming a day streak", async () => {
    // The design's second line reads "N-day streak". Nothing in the app records
    // which days anybody used it, so printing that would be inventing a figure,
    // the same fault as the distance chip that once showed a number nobody had
    // measured.
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    await screen.findByTestId("settings-profile");
    expect(screen.queryByText(/day streak/i)).toBeNull();
    expect(screen.getByText(/tasks? done/i)).toBeTruthy();
  });
});

// The grouping itself. These are structural rather than behavioural, and they
// exist because the screen's previous problem was not that anything was broken,
// it was that related things sat apart and unrelated things sat together. That
// is invisible to every other kind of test.
describe("SettingsScreen grouping", () => {
  // Rendered tree as a string, so the ORDER of things can be checked. Position
  // is the whole point here and no query can express it.
  async function renderedOrder(): Promise<string> {
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );
    await screen.findByText("What we collect");
    return JSON.stringify(screen.toJSON());
  }

  it("puts every setting under one of the six section headings", async () => {
    const tree = await renderedOrder();

    for (const section of [
      "ACCOUNT",
      "PREFERENCES",
      "APPEARANCE",
      "DATA AND PRIVACY",
      "ABOUT",
      "DANGER ZONE",
    ]) {
      expect(tree).toContain(section);
    }
  });

  it("orders the sections from how it looks down to what cannot be undone", async () => {
    const tree = await renderedOrder();
    const at = (text: string) => tree.indexOf(text);

    expect(at("APPEARANCE")).toBeLessThan(at("PREFERENCES"));
    expect(at("PREFERENCES")).toBeLessThan(at("ACCOUNT"));
    expect(at("ACCOUNT")).toBeLessThan(at("DATA AND PRIVACY"));
    expect(at("DATA AND PRIVACY")).toBeLessThan(at("ABOUT"));
    // Deleting the account is last on purpose, so nobody meets it on the way to
    // something ordinary.
    expect(at("ABOUT")).toBeLessThan(at("DANGER ZONE"));
  });

  it("carries no standing caption under either destructive row", async () => {
    // These captions used to exist, and one of them was a real bug: it sat
    // below "What we collect" and above the clear button, so it read as though
    // a row that only opens a page was going to delete your data. Both are gone
    // now for a simpler reason. Each row already leads somewhere that states the
    // consequence and asks, so the caption was the warning printed a second time
    // in the one place it cannot be acted on, which trains people to read past
    // the copy that does matter.
    const tree = await renderedOrder();

    expect(tree.indexOf("What we collect")).toBeLessThan(
      tree.indexOf("Clear Local Data")
    );
    expect(tree).not.toContain("Clearing removes what this app has saved");
    expect(tree).not.toContain("Deletes your account and everything in it");
  });

  it("groups the email, two-factor and log out together under Account", async () => {
    const tree = await renderedOrder();

    expect(tree.indexOf("ACCOUNT")).toBeLessThan(tree.indexOf("a@b.com"));
    expect(tree.indexOf("a@b.com")).toBeLessThan(tree.indexOf("Two-factor authentication"));
    expect(tree.indexOf("Two-factor authentication")).toBeLessThan(tree.indexOf("Log out"));
    // Log out must still be above the next heading, or it has escaped the group.
    expect(tree.indexOf("Log out")).toBeLessThan(tree.indexOf("DATA AND PRIVACY"));
  });

  it("shows the email as a fact rather than something to press", async () => {
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText("a@b.com")).toBeTruthy();
    // Rendering it as a button would have a screen reader offer to activate a
    // row that does nothing.
    expect(screen.queryByRole("button", { name: /^Email/ })).toBeNull();
  });

  it("opens each legal document from About", async () => {
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByText("Privacy policy"));
    expect(mockNavigate).toHaveBeenCalledWith("Legal", { document: "privacy" });

    fireEvent.press(screen.getByText("Terms of use"));
    expect(mockNavigate).toHaveBeenCalledWith("Legal", { document: "terms" });
  });

  it("opens the delete screen rather than deleting from here", async () => {
    // Deleting needs a password and a list too long for an alert, so this row
    // must never grow a confirmation of its own.
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByText("Delete Account"));

    expect(mockNavigate).toHaveBeenCalledWith("DeleteAccount");
  });
});
