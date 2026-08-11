// Tests for the sign up screen. The auth service is mocked, so these cover the
// screen's own behaviour: it validates before submitting, calls the service only
// with good input, surfaces a form error on failure, and links back to login.

// Used to type the fake navigation prop.
import type { ComponentProps } from "react";
// Drives the form and waits for the async submit to settle.
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

// The screen under test.
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
// The Firebase call it makes, mocked below.
import { registerWithEmail } from "@/services/auth";

jest.mock("@/services/auth", () => ({ registerWithEmail: jest.fn() }));

const mockRegister = registerWithEmail as jest.Mock;

// Renders the screen with a fake navigation object, so the footer link can be
// checked.
function renderScreen() {
  const navigate = jest.fn();
  const props = { navigation: { navigate } } as unknown as ComponentProps<typeof RegisterScreen>;
  render(<RegisterScreen {...props} />);
  return { navigate };
}

// Types a valid email and matching passwords into the three fields.
function fillValidForm() {
  fireEvent.changeText(screen.getByTestId("register-email"), "a@b.com");
  fireEvent.changeText(screen.getByTestId("register-password"), "password123");
  fireEvent.changeText(screen.getByTestId("register-confirm"), "password123");
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Local validation runs first, so a bad form never costs a round trip.
  it("shows inline validation errors and does not call the service on invalid input", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Create account"));

    expect(screen.getByTestId("register-email-error")).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // The confirm field is not sent; only the email and the password are.
  it("calls the register service with valid input", async () => {
    mockRegister.mockResolvedValue("uid-123");
    renderScreen();
    fillValidForm();
    fireEvent.press(screen.getByText("Create account"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123");
    });
  });

  it("surfaces a form-level error when the service rejects", async () => {
    mockRegister.mockRejectedValue({ code: "auth/email-already-in-use" });
    renderScreen();
    fillValidForm();
    fireEvent.press(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByTestId("register-form-error")).toBeTruthy();
    });
  });

  it("navigates to Login from the footer link", () => {
    const { navigate } = renderScreen();
    fireEvent.press(screen.getByText("Log in"));
    expect(navigate).toHaveBeenCalledWith("Login");
  });
});
