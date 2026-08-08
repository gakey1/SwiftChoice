// Tests for the change-password screen. The change itself has its own tests, so
// these cover the screen's job: catching bad input before it costs a round trip,
// putting each error on the field that caused it, and telling the user what
// happened to their second factor.

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ChangePasswordScreen } from "@/screens/settings/ChangePasswordScreen";
import { changePassword } from "@/features/auth/passwordChange";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/components/Icon", () => ({ Icon: () => null }));
jest.mock("@/components/AmbientBackground", () => ({ AmbientBackground: () => null }));
jest.mock("@/features/auth/passwordChange", () => ({ changePassword: jest.fn() }));

const mockChangePassword = changePassword as jest.Mock;
const navigation = { goBack: jest.fn(), navigate: jest.fn() };

function renderScreen() {
  return render(
    <ThemeProvider>
      <ChangePasswordScreen
        navigation={navigation as never}
        route={{ key: "ChangePassword", name: "ChangePassword" } as never}
      />
    </ThemeProvider>
  );
}

function fill(current: string, next: string, confirm: string) {
  fireEvent.changeText(screen.getByLabelText("Current password"), current);
  fireEvent.changeText(screen.getByLabelText("New password"), next);
  fireEvent.changeText(screen.getByLabelText("Confirm new password"), confirm);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChangePassword.mockResolvedValue({ ok: true, twoFactorWasReset: false });
});

describe("ChangePasswordScreen validation", () => {
  it("asks for the current password before doing anything", () => {
    renderScreen();
    fill("", "new-password", "new-password");

    fireEvent.press(screen.getByText("Change password"));

    expect(screen.getByText("Enter your current password.")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("rejects a short new password on the device", () => {
    // Firebase would reject it too, but only after a round trip, and the error
    // would not point at a field.
    renderScreen();
    fill("old-password", "short", "short");

    fireEvent.press(screen.getByText("Change password"));

    // Exact, because the intro paragraph also mentions the length.
    expect(screen.getByText("Use at least 8 characters.")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("catches a mistyped confirmation", () => {
    // The reason this field exists. A typo nobody checks locks you out of your
    // own account, and the only way back is the reset email.
    renderScreen();
    fill("old-password", "new-password", "new-pasword");

    fireEvent.press(screen.getByText("Change password"));

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});

describe("ChangePasswordScreen submission", () => {
  it("sends the current and the new password", async () => {
    renderScreen();
    fill("old-password", "new-password", "new-password");

    fireEvent.press(screen.getByText("Change password"));

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith("old-password", "new-password")
    );
  });

  it("puts a wrong current password on the current password field", async () => {
    mockChangePassword.mockResolvedValue({
      ok: false,
      field: "current",
      message: "That is not your current password.",
    });

    renderScreen();
    fill("wrong", "new-password", "new-password");
    fireEvent.press(screen.getByText("Change password"));

    expect(await screen.findByText("That is not your current password.")).toBeTruthy();
  });

  it("confirms the change rather than silently returning", async () => {
    renderScreen();
    fill("old-password", "new-password", "new-password");
    fireEvent.press(screen.getByText("Change password"));

    expect(await screen.findByText("Password changed")).toBeTruthy();
    // Staying put is deliberate: the two-factor notice below is the only place
    // the user is told their authenticator stopped working.
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("says the second factor was switched off, when it was", async () => {
    mockChangePassword.mockResolvedValue({ ok: true, twoFactorWasReset: true });

    renderScreen();
    fill("old-password", "new-password", "new-password");
    fireEvent.press(screen.getByText("Change password"));

    expect(await screen.findByText(/Two-factor authentication has been switched off/i)).toBeTruthy();
  });

  it("does not mention two-factor when it was never on", async () => {
    mockChangePassword.mockResolvedValue({ ok: true, twoFactorWasReset: false });

    renderScreen();
    fill("old-password", "new-password", "new-password");
    fireEvent.press(screen.getByText("Change password"));

    await screen.findByText("Password changed");
    expect(screen.queryByText(/has been switched off/i)).toBeNull();
  });
});
