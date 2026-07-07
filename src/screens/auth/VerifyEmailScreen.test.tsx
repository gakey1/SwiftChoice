// Tests for the verify-email screen. The auth hook and service are mocked, so
// these check the screen's behaviour: it shows the pending message with the
// user's email, re-checks when asked, resends the link, and logs out.

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { VerifyEmailScreen } from "./VerifyEmailScreen";

const mockRefresh = jest.fn();
const mockResend = jest.fn();
const mockLogout = jest.fn();

// Fake the signed-in user and the auth actions, so the screen can be checked
// without real Firebase.
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "test@swiftchoice.com" },
    refreshEmailVerified: mockRefresh,
  }),
}));

jest.mock("@/services/auth", () => ({
  resendVerificationEmail: (...args: unknown[]) => mockResend(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the pending-verification message with the user's email", () => {
    const { getByText } = render(<VerifyEmailScreen />);

    expect(getByText("Confirm your email")).toBeTruthy();
    expect(getByText(/test@swiftchoice.com/)).toBeTruthy();
  });

  it("re-checks verification when 'I have verified' is pressed", async () => {
    mockRefresh.mockResolvedValue(false);
    const { getByText } = render(<VerifyEmailScreen />);

    fireEvent.press(getByText("I have verified"));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(getByText(/Not verified yet/)).toBeTruthy();
  });

  it("resends the link when 'Resend link' is pressed", async () => {
    mockResend.mockResolvedValue(undefined);
    const { getByText } = render(<VerifyEmailScreen />);

    fireEvent.press(getByText("Resend link"));

    await waitFor(() => expect(mockResend).toHaveBeenCalledTimes(1));
    expect(getByText(/New link sent/)).toBeTruthy();
  });

  it("logs out when 'Log out' is pressed", () => {
    const { getByText } = render(<VerifyEmailScreen />);

    fireEvent.press(getByText("Log out"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
