// Tests for the code screen shown between signing in and the app. The real TOTP
// maths runs here rather than being mocked, so a passing test means a genuinely
// valid code was accepted and an invalid one was not.

// Drives the form and waits for the async checks to settle.
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

// The demo-code switch, mocked below so both builds can be exercised.
import { showsDemoCodeOnChallenge } from "@/features/auth/demoCode";
// The real code generator, used to produce valid and invalid inputs.
import { generateCode } from "@/features/auth/totp";
// The screen under test.
import { TotpChallengeScreen } from "@/screens/auth/TotpChallengeScreen";
// The escape route, mocked below.
import { logout } from "@/services/auth";
// The stored secret, mocked below so each test chooses what is on the device.
import { getTotpSecret } from "@/services/localdb/totpStorage";

jest.mock("@/services/auth", () => ({ logout: jest.fn() }));
jest.mock("@/services/localdb/totpStorage", () => ({ getTotpSecret: jest.fn() }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));
// Mocked rather than driven through __DEV__, so a release build's behaviour can
// be exercised here without the rest of the suite running as one.
jest.mock("@/features/auth/demoCode", () => ({
  showsDemoCodeOnChallenge: jest.fn(),
}));

const mockGetSecret = getTotpSecret as jest.Mock;
const mockLogout = logout as jest.Mock;
const mockShowsDemoCode = showsDemoCodeOnChallenge as jest.Mock;

// A known secret and the label the screen builds from the mocked user, so the
// generated codes match what the screen checks against.
const SECRET = "JBSWY3DPEHPK3PXP";
const LABEL = "a@b.com";

// Renders the screen and hands back the pass callback to assert on.
function renderScreen() {
  const onPassed = jest.fn();
  render(<TotpChallengeScreen onPassed={onPassed} />);
  return { onPassed };
}

describe("TotpChallengeScreen", () => {
  // An enrolled device in a development build is the default here.
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecret.mockResolvedValue(SECRET);
    mockShowsDemoCode.mockReturnValue(true);
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

  // A well-formed code from the wrong secret is the case a shape check alone
  // would let through.
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

  // Failing open is deliberate. This screen only renders because a secret
  // existed a moment earlier, so finding none means it was removed in between,
  // and holding somebody behind a factor that no longer exists would lock them
  // out of their own account with no way back.
  it("lets the user through when the secret has gone", async () => {
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

  it("shows the on-device code in development, so the factor can be demonstrated", async () => {
    mockShowsDemoCode.mockReturnValue(true);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("totp-challenge-demo-code")).toBeTruthy()
    );
  });

  // The whole point of the switch. Printing a valid code on the screen that
  // asks for one leaves the factor stopping nobody, and it fails silently: the
  // build looks and behaves completely normally.
  it("does not print the code on the gate in a release build", async () => {
    mockShowsDemoCode.mockReturnValue(false);
    const { onPassed } = renderScreen();

    await waitFor(() => expect(screen.getByTestId("totp-challenge-code")).toBeTruthy());
    expect(screen.queryByTestId("totp-challenge-demo-code")).toBeNull();

    // And the screen still works: hiding the hint must not break the gate.
    fireEvent.changeText(
      screen.getByTestId("totp-challenge-code"),
      generateCode(SECRET, LABEL)
    );
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(onPassed).toHaveBeenCalledTimes(1));
  });
});
