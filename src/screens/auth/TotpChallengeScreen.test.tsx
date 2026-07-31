// Tests for the code screen shown between signing in and the app.
//
// The real TOTP maths runs here rather than being mocked, so a passing test
// means a genuinely valid code was accepted and an invalid one was not.

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { generateCode } from "@/features/auth/totp";
import { TotpChallengeScreen } from "@/screens/auth/TotpChallengeScreen";
import { logout } from "@/services/auth";
import { getTotpSecret } from "@/services/localdb/totpStorage";

jest.mock("@/services/auth", () => ({ logout: jest.fn() }));
jest.mock("@/services/localdb/totpStorage", () => ({ getTotpSecret: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));

const mockGetSecret = getTotpSecret as jest.Mock;
const mockLogout = logout as jest.Mock;

const SECRET = "JBSWY3DPEHPK3PXP";
const LABEL = "a@b.com";

function renderScreen() {
  const onPassed = jest.fn();
  render(<TotpChallengeScreen onPassed={onPassed} />);
  return { onPassed };
}

describe("TotpChallengeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecret.mockResolvedValue(SECRET);
  });

  it("lets the user through on a valid code", async () => {
    const { onPassed } = renderScreen();

    fireEvent.changeText(
      screen.getByTestId("totp-challenge-code"),
      generateCode(SECRET, LABEL)
    );
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(onPassed).toHaveBeenCalledTimes(1));
  });

  it("does not let the user through on a wrong code", async () => {
    const { onPassed } = renderScreen();

    fireEvent.changeText(screen.getByTestId("totp-challenge-code"), "000000");
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText(/not right/i)).toBeTruthy();
    });
    expect(onPassed).not.toHaveBeenCalled();
  });

  it("does not let the user through on a code from a different secret", async () => {
    const { onPassed } = renderScreen();

    fireEvent.changeText(
      screen.getByTestId("totp-challenge-code"),
      generateCode("KRSXG5CTMVRXEZLU", LABEL)
    );
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText(/not right/i)).toBeTruthy());
    expect(onPassed).not.toHaveBeenCalled();
  });

  it("lets the user through when the secret has gone", async () => {
    // Failing open is deliberate here. This screen only renders because a
    // secret existed a moment earlier, so finding none means it was removed in
    // between, and holding somebody behind a factor that no longer exists would
    // lock them out of their own account with no way back.
    mockGetSecret.mockResolvedValue(null);
    const { onPassed } = renderScreen();

    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(onPassed).toHaveBeenCalledTimes(1));
  });

  it("offers logging out as the way off this screen", () => {
    renderScreen();

    fireEvent.press(screen.getByText("Log out"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
