import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { registerWithEmail } from "@/services/auth";

jest.mock("@/services/auth", () => ({ registerWithEmail: jest.fn() }));

const mockRegister = registerWithEmail as jest.Mock;

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
    render(<RegisterScreen />);
    fireEvent.press(screen.getByText("Create account"));

    expect(screen.getByTestId("register-email-error")).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls the register service with valid input", async () => {
    mockRegister.mockResolvedValue("uid-123");
    render(<RegisterScreen />);
    fillValidForm();
    fireEvent.press(screen.getByText("Create account"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123");
    });
  });

  it("surfaces a form-level error when the service rejects", async () => {
    mockRegister.mockRejectedValue({ code: "auth/email-already-in-use" });
    render(<RegisterScreen />);
    fillValidForm();
    fireEvent.press(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByTestId("register-form-error")).toBeTruthy();
    });
  });
});
