// Tests for turning two-factor authentication on and off.
//
// The real TOTP maths runs, so "enrols on a valid code" means a code actually
// derived from the new secret was accepted. The keychain is mocked.

import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

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
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));
// The real generator needs expo-crypto, which has no native module under Jest.
jest.mock("expo-crypto", () => ({
  getRandomBytes: (size: number) => new Uint8Array(size).fill(9),
}));

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

  it("reveals a key to type into an authenticator app", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("totp-status-off")).toBeTruthy());

    fireEvent.press(screen.getByText("Set it up"));

    expect(screen.getByTestId("totp-secret")).toBeTruthy();
    expect(screen.getByTestId("totp-uri").props.children).toContain("otpauth://totp/");
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

    const secret = screen.getByTestId("totp-secret").props.children as string;
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
