// Tests for the sign up screen. The auth service is mocked, so these check the
// screen's own behaviour: it validates the form, calls the service only with
// good input, shows a form error when sign up fails, and links to login.

import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { registerWithEmail } from "@/services/auth";

jest.mock("@/services/auth", () => ({ registerWithEmail: jest.fn() }));

const mockRegister = registerWithEmail as jest.Mock;

// Renders the screen with a fake navigation object so the footer link can be checked.
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

  it("shows inline validation errors and does not call the service on invalid input", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Create account"));

    expect(screen.getByTestId("register-email-error")).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

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
