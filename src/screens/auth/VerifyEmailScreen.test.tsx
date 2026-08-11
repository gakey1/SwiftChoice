// Tests for the verify-email screen. The auth hook and service are mocked, so
// these cover the screen's behaviour: it names the address, re-checks when
// asked, resends the link, and offers a way out.

import React from "react";
// Drives the buttons and waits for the async handlers to settle.
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// The screen under test.
import { VerifyEmailScreen } from "./VerifyEmailScreen";

// Declared before the mocks below, which close over them.
const mockRefresh = jest.fn();
const mockResend = jest.fn();
const mockLogout = jest.fn();

// A fixed signed-in user, so the address in the copy is predictable.
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "test@swiftchoice.com" },
    refreshEmailVerified: mockRefresh,
  }),
}));

// The two Firebase calls the screen offers.
jest.mock("@/services/auth", () => ({
  resendVerificationEmail: (...args: unknown[]) => mockResend(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The address has to appear, or the user cannot tell which inbox to open.
  it("shows the pending-verification message with the user's email", () => {
    const { getByText } = render(<VerifyEmailScreen />);

    expect(getByText("Confirm your email")).toBeTruthy();
    expect(getByText(/test@swiftchoice.com/)).toBeTruthy();
  });

  // The app checks with Firebase rather than taking the user's word.
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

  // A mistyped address must not be a trap, so signing out is the way back.
  it("logs out when the wrong-email escape is pressed", () => {
    const { getByText } = render(<VerifyEmailScreen />);

    fireEvent.press(getByText("Log out and try again"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
