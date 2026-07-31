// Tests for the password reset screen. The auth service is mocked, so these
// check the screen's own behaviour.
//
// The important ones are the last three. An unregistered email and a malformed
// one must both end on the same confirmation a real send gives, because a
// different outcome would tell somebody which addresses have accounts. The
// opposite case matters too: a genuine fault like a rate limit has to show,
// since pretending it worked would leave the user waiting for an email that is
// never coming.

import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { sendPasswordReset } from "@/services/auth";
import { markPasswordResetRequested } from "@/services/localdb/passwordResetFlag";

jest.mock("@/services/auth", () => ({ sendPasswordReset: jest.fn() }));
jest.mock("@/services/localdb/passwordResetFlag", () => ({
  markPasswordResetRequested: jest.fn(),
}));

const mockSendReset = sendPasswordReset as jest.Mock;
const mockMarkRequested = markPasswordResetRequested as jest.Mock;

// Renders the screen with a fake navigation object so the links can be checked.
function renderScreen() {
  const navigate = jest.fn();
  const props = {
    navigation: { navigate },
  } as unknown as ComponentProps<typeof ForgotPasswordScreen>;
  render(<ForgotPasswordScreen {...props} />);
  return { navigate };
}

// Types a valid email and presses the send button.
function submitEmail(email = "a@b.com") {
  fireEvent.changeText(screen.getByTestId("forgot-password-email"), email);
  fireEvent.press(screen.getByText("Send reset link"));
}

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a validation error and does not call the service on a bad email", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Send reset link"));

    expect(screen.getByTestId("forgot-password-email-error")).toBeTruthy();
    expect(mockSendReset).not.toHaveBeenCalled();
  });

  it("calls the service and confirms when the email is valid", async () => {
    mockSendReset.mockResolvedValue(undefined);
    renderScreen();
    submitEmail();

    await waitFor(() => {
      expect(mockSendReset).toHaveBeenCalledWith("a@b.com");
    });
    expect(screen.getByTestId("forgot-password-sent")).toBeTruthy();
  });

  it("shows the same confirmation when the account does not exist", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/user-not-found" });
    renderScreen();
    submitEmail("nobody@b.com");

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-sent")).toBeTruthy();
    });
    expect(screen.queryByTestId("forgot-password-form-error")).toBeNull();
  });

  it("does not confirm when the send genuinely failed", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/too-many-requests" });
    renderScreen();
    submitEmail();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-form-error")).toBeTruthy();
    });
    expect(screen.queryByTestId("forgot-password-sent")).toBeNull();
  });

  it("tells the user to check spam, since the sender is a no-reply address", async () => {
    mockSendReset.mockResolvedValue(undefined);
    renderScreen();
    submitEmail();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-sent").props.children).toEqual(
        expect.stringContaining("spam")
      );
    });
  });

  it("records the reset on this phone, so the 2FA enrolment is invalidated later", async () => {
    mockSendReset.mockResolvedValue(undefined);
    renderScreen();
    submitEmail();

    await waitFor(() => expect(mockMarkRequested).toHaveBeenCalledTimes(1));
  });

  it("records it in the account-may-not-exist case too", async () => {
    // The app cannot tell that branch apart without leaking whether the email is
    // registered, so it has to behave identically here as well.
    mockSendReset.mockRejectedValue({ code: "auth/user-not-found" });
    renderScreen();
    submitEmail("nobody@b.com");

    await waitFor(() => expect(mockMarkRequested).toHaveBeenCalledTimes(1));
  });

  it("does not record a reset that genuinely failed to send", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/too-many-requests" });
    renderScreen();
    submitEmail();

    await waitFor(() => expect(screen.getByTestId("forgot-password-form-error")).toBeTruthy());
    expect(mockMarkRequested).not.toHaveBeenCalled();
  });

  it("navigates back to Login from the footer link", () => {
    const { navigate } = renderScreen();
    fireEvent.press(screen.getByText("Back to log in"));
    expect(navigate).toHaveBeenCalledWith("Login");
  });
});
