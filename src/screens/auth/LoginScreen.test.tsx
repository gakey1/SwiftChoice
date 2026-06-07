import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { LoginScreen } from "@/screens/auth/LoginScreen";
import { loginWithEmail } from "@/services/auth";

jest.mock("@/services/auth", () => ({ loginWithEmail: jest.fn() }));

const mockLogin = loginWithEmail as jest.Mock;

function renderScreen() {
  const navigate = jest.fn();
  const props = { navigation: { navigate } } as unknown as ComponentProps<typeof LoginScreen>;
  render(<LoginScreen {...props} />);
  return { navigate };
}

function fillValidForm() {
  fireEvent.changeText(screen.getByTestId("login-email"), "a@b.com");
  fireEvent.changeText(screen.getByTestId("login-password"), "secretpw");
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows inline validation errors and does not call the service on invalid input", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Log in"));

    expect(screen.getByTestId("login-email-error")).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("calls the login service with valid input", async () => {
    mockLogin.mockResolvedValue("uid-9");
    renderScreen();
    fillValidForm();
    fireEvent.press(screen.getByText("Log in"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("a@b.com", "secretpw");
    });
  });

  it("shows one generic error message when sign-in fails", async () => {
    mockLogin.mockRejectedValue({ code: "auth/invalid-credential" });
    renderScreen();
    fillValidForm();
    fireEvent.press(screen.getByText("Log in"));

    await waitFor(() => {
      expect(screen.getByText("Incorrect email or password.")).toBeTruthy();
    });
  });

  it("navigates to Register from the footer link", () => {
    const { navigate } = renderScreen();
    fireEvent.press(screen.getByText("Create account"));
    expect(navigate).toHaveBeenCalledWith("Register");
  });
});
