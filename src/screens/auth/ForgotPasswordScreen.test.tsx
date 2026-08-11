// Tests for the password reset screen. The auth service is mocked, so these
// cover the screen's own behaviour.
//
// The line they draw runs both ways: an unregistered email must end on the same
// confirmation a real send gives, and a genuine fault must not be dressed up as
// success, or the user waits for an email that is never coming.

// Used to type the fake navigation prop.
import type { ComponentProps } from "react";
// Drives the form and waits for the async submit to settle.
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

// The screen under test.
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
// The Firebase call it makes, mocked below.
import { sendPasswordReset } from "@/services/auth";
// The local flag it sets for the next sign-in, mocked below.
import { markPasswordResetRequested } from "@/services/localdb/passwordResetFlag";

jest.mock("@/services/auth", () => ({ sendPasswordReset: jest.fn() }));
jest.mock("@/services/localdb/passwordResetFlag", () => ({
  markPasswordResetRequested: jest.fn(),
}));

const mockSendReset = sendPasswordReset as jest.Mock;
const mockMarkRequested = markPasswordResetRequested as jest.Mock;

// Renders the screen with a fake navigation object, so the links can be checked.
function renderScreen() {
  const navigate = jest.fn();
  const props = {
    navigation: { navigate },
  } as unknown as ComponentProps<typeof ForgotPasswordScreen>;
  render(<ForgotPasswordScreen {...props} />);
  return { navigate };
}

// Types an email and presses the send button.
function submitEmail(email = "a@b.com") {
  fireEvent.changeText(screen.getByTestId("forgot-password-email"), email);
  fireEvent.press(screen.getByText("Send reset link"));
}

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Local validation runs first, so a bad address never costs a round trip.
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

  // The same confirmation and no error, so the two cases are indistinguishable.
  it("shows the same confirmation when the account does not exist", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/user-not-found" });
    renderScreen();
    submitEmail("nobody@b.com");

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-sent")).toBeTruthy();
    });
    expect(screen.queryByTestId("forgot-password-form-error")).toBeNull();
  });

  // The other direction: a rate limit is a real fault and must show.
  it("does not confirm when the send genuinely failed", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/too-many-requests" });
    renderScreen();
    submitEmail();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-form-error")).toBeTruthy();
    });
    expect(screen.queryByTestId("forgot-password-sent")).toBeNull();
  });

  // The sender is a no-reply address, so filtering is the usual reason people
  // get stuck here.
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

  // The flag set here is what the next sign-in reads to drop the enrolment.
  it("records the reset on this phone, so the 2FA enrolment is invalidated later", async () => {
    mockSendReset.mockResolvedValue(undefined);
    renderScreen();
    submitEmail();

    await waitFor(() => expect(mockMarkRequested).toHaveBeenCalledTimes(1));
  });

  // The app cannot tell that branch apart without leaking whether the email is
  // registered, so it has to behave identically here as well.
  it("records it in the account-may-not-exist case too", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/user-not-found" });
    renderScreen();
    submitEmail("nobody@b.com");

    await waitFor(() => expect(mockMarkRequested).toHaveBeenCalledTimes(1));
  });

  // No link went out, so nothing should be invalidated later.
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
