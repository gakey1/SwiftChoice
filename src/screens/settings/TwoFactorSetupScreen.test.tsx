// Tests for turning two-factor authentication on and off.
//
// The real TOTP maths runs, so "enrols on a valid code" means a code actually
// derived from the new secret was accepted. The keychain is mocked.

import type { ComponentProps } from "react";
import { Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";

import { generateCode } from "@/features/auth/totp";
import { TwoFactorSetupScreen } from "@/screens/settings/TwoFactorSetupScreen";
import {
  clearTotpSecret,
  getTotpSecret,
  saveTotpSecret,
} from "@/services/localdb/totpStorage";

jest.mock("@/services/localdb/totpStorage", () => ({
  getTotpSecret: jest.fn(),
  saveTotpSecret: jest.fn(),
  clearTotpSecret: jest.fn(),
}));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
// Stands in for the real square so what it encodes can be asserted. Scanning is
// a camera concern and cannot be tested here; that the URI reaching it is the
// right one is exactly what can.
jest.mock("react-native-qrcode-svg", () => {
  const { Text: RNText } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({ value }: { value: string }) => (
      <RNText testID="totp-qr-value">{value}</RNText>
    ),
  };
});
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));
// The real generator needs expo-crypto, which has no native module under Jest.
//
// Every call returns different bytes on purpose. A fixed fill would make any
// two secrets identical, and tests asserting that two parts of the screen show
// the same secret would then pass even if each had generated its own.
jest.mock("expo-crypto", () => {
  let counter = 0;
  return {
    getRandomBytes: (size: number) => {
      counter += 1;
      return new Uint8Array(size).fill(counter % 251);
    },
  };
});

const mockGetSecret = getTotpSecret as jest.Mock;
const mockSaveSecret = saveTotpSecret as jest.Mock;
const mockClearSecret = clearTotpSecret as jest.Mock;

function renderScreen(reason?: "password-changed") {
  const goBack = jest.fn();
  const navigate = jest.fn();
  const props = {
    navigation: { goBack, navigate, canGoBack: () => true },
    route: { params: reason ? { reason } : undefined },
  } as unknown as ComponentProps<typeof TwoFactorSetupScreen>;
  render(<TwoFactorSetupScreen {...props} />);
  return { goBack, navigate };
}

describe("TwoFactorSetupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecret.mockResolvedValue(null);
  });

  it("shows the off state when this phone has not enrolled", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
  });

  it("shows the on state when this phone has enrolled", async () => {
    mockGetSecret.mockResolvedValue("JBSWY3DPEHPK3PXP");
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("totp-status-on")).toBeTruthy());
  });

  it("offers all three ways of getting the key into an authenticator app", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());

    fireEvent.press(screen.getByText("Set it up"));

    // A camera on a second phone, a tap on this one, or typing it out. Each
    // covers a case the others cannot: the QR needs two devices, the handoff
    // needs an authenticator installed here, the key needs neither.
    expect(screen.getByTestId("totp-qr")).toBeTruthy();
    expect(screen.getByText("Open in your authenticator app")).toBeTruthy();
    expect(screen.getByTestId("totp-secret")).toBeTruthy();
  });

  it("encodes the enrolment URI in the square, not just any string", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));

    const encoded = screen.getByTestId("totp-qr-value").props.children as string;
    const shown = (screen.getByTestId("totp-secret").props.children as string).replace(
      / /g,
      ""
    );

    expect(encoded).toContain("otpauth://totp/");
    // Scanning and typing have to enrol the same phone against the same secret.
    // If these ever drift apart, one of the two paths silently enrols against a
    // secret this app does not hold.
    expect(encoded).toContain(`secret=${shown}`);
  });

  it("shows the key in blocks of four so it can be typed without losing your place", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());

    fireEvent.press(screen.getByText("Set it up"));

    expect(screen.getByTestId("totp-secret").props.children).toMatch(
      /^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/
    );
  });

  it("copies the key without the spaces", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));
    const shown = screen.getByTestId("totp-secret").props.children as string;

    fireEvent.press(screen.getByText("Copy key"));

    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(shown.replace(/ /g, ""))
    );
    expect(screen.getByText("Key copied")).toBeTruthy();
  });

  it("hands the enrolment to an authenticator app on this phone", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));

    fireEvent.press(screen.getByText("Open in your authenticator app"));

    await waitFor(() =>
      expect(openURL).toHaveBeenCalledWith(expect.stringContaining("otpauth://totp/"))
    );
    openURL.mockRestore();
  });

  it("says so when no authenticator app answers, rather than doing nothing", async () => {
    // Android 11 and later hide unlisted schemes, and a phone may simply have no
    // authenticator installed. A button that silently does nothing reads as
    // broken, and the other two paths still work.
    const openURL = jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));

    fireEvent.press(screen.getByText("Open in your authenticator app"));

    await waitFor(() => expect(screen.getByTestId("totp-handoff-error")).toBeTruthy());
    openURL.mockRestore();
  });

  it("does not enrol on a wrong code", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));

    fireEvent.changeText(screen.getByTestId("totp-setup-code"), "000000");
    fireEvent.press(screen.getByText("Turn on"));

    await waitFor(() => expect(screen.getByText(/did not match/i)).toBeTruthy());
    // The important half. Saving on an unverified code would switch the factor
    // on for somebody who cannot actually produce codes, locking them out of
    // their own account on the next sign-in.
    expect(mockSaveSecret).not.toHaveBeenCalled();
  });

  it("enrols on a valid code", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    fireEvent.press(screen.getByText("Set it up"));

    // Spaces stripped because the screen shows the key grouped for reading.
    // Deriving the code from what is actually on screen keeps this test honest:
    // it passes only if a user copying what they see enrols successfully.
    const secret = (screen.getByTestId("totp-secret").props.children as string).replace(
      / /g,
      ""
    );
    fireEvent.changeText(
      screen.getByTestId("totp-setup-code"),
      generateCode(secret, "a@b.com")
    );
    fireEvent.press(screen.getByText("Turn on"));

    await waitFor(() => expect(mockSaveSecret).toHaveBeenCalledWith(secret));
    expect(screen.getByTestId("totp-status-on")).toBeTruthy();
  });

  it("turns the factor off again", async () => {
    mockGetSecret.mockResolvedValue("JBSWY3DPEHPK3PXP");
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-on")).toBeTruthy());

    fireEvent.press(screen.getByText("Turn off"));

    await waitFor(() => expect(mockClearSecret).toHaveBeenCalledTimes(1));
  });

  it("explains itself when a password change removed the enrolment", async () => {
    renderScreen("password-changed");

    await waitFor(() => expect(screen.getByTestId("totp-reset-banner")).toBeTruthy());
    // Says it creates a new entry, so nobody thinks they need the old one and
    // concludes they are locked out.
    expect(screen.getByTestId("totp-reset-banner").props.children).toEqual(
      expect.stringContaining("new one")
    );
    expect(screen.getByText("Not now")).toBeTruthy();
  });

  it("shows no banner in the ordinary case", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());
    expect(screen.queryByTestId("totp-reset-banner")).toBeNull();
  });
});
