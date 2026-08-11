// Tests for the delete-account screen. The deletion itself is mocked, so
// these cover the screen's own job: refusing to act without a password, asking
// twice, showing failures where they can be read, and not navigating on success.
//
// Some of these assert on wording, the same way the data-and-privacy tests do.
// That is deliberate here too. This screen is a set of promises about what is
// about to be destroyed, and a promise that quietly drifts out of date is worse
// than none, because it looks checked and is not.

import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { DeleteAccountScreen } from "@/screens/settings/DeleteAccountScreen";
import { deleteAccount } from "@/features/privacy/accountDeletion";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/components/Icon", () => ({ Icon: () => null }));
jest.mock("@/components/AmbientBackground", () => ({ AmbientBackground: () => null }));
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "a@b.com" }, initializing: false }),
}));

// The deletion has its own tests, including the ordering rules. This file only
// covers the screen's wiring to it.
jest.mock("@/features/privacy/accountDeletion", () => ({ deleteAccount: jest.fn() }));

const mockDeleteAccount = deleteAccount as jest.Mock;
const navigation = { goBack: jest.fn(), navigate: jest.fn() };

function renderScreen() {
  return render(
    <ThemeProvider>
      <DeleteAccountScreen
        navigation={navigation as never}
        route={{ key: "DeleteAccount", name: "DeleteAccount" } as never}
      />
    </ThemeProvider>
  );
}

// Presses Delete and takes the destructive option in the confirmation, which is
// the only path that reaches the deletion.
async function confirmDeletion(getByText: (text: string) => unknown) {
  const alertSpy = jest.spyOn(Alert, "alert");
  fireEvent.press(getByText("Delete my account") as never);

  const buttons = alertSpy.mock.calls[0]?.[2] as
    | { text?: string; onPress?: () => void }[]
    | undefined;
  const destructive = buttons?.find((b) => b.text === "Delete everything");

  // Wrapped in act because the deletion updates state after an await, which
  // otherwise lands outside React's knowledge and warns.
  await act(async () => {
    destructive?.onPress?.();
  });
  return alertSpy;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockDeleteAccount.mockResolvedValue({ ok: true, decisionsDeleted: 2 });
});

describe("DeleteAccountScreen, what it tells the user", () => {
  it("lists what gets deleted rather than summarising it as all your data", () => {
    // A person deciding this needs to recognise what they are losing. "All your
    // data" is the kind of phrase that gets skimmed past.
    const { getByText } = renderScreen();

    expect(getByText(/Your SwiftChoice account/i)).toBeTruthy();
    expect(getByText(/Your decision history, both on this phone and in your account/i)).toBeTruthy();
    expect(getByText(/Your Fuel and Focus pools/i)).toBeTruthy();
  });

  it("says the history goes from the cloud too, unlike the clear-data flow", () => {
    // The clear-data screen has to say "on this phone" because the cloud copy
    // survives it. This one deletes that copy, so it can say so, and this test
    // pins the difference between the two screens.
    const { getByText } = renderScreen();

    expect(getByText(/on this phone and in the cloud/i)).toBeTruthy();
  });

  it("admits what deleting the account cannot reach", () => {
    // Without this section the list above reads as more complete than it is, and
    // overstating on the privacy screen is the fastest way to lose trust.
    const { getByText } = renderScreen();

    expect(getByText(/already sent to Google or the weather service/i)).toBeTruthy();
  });

  it("names the account the password belongs to", () => {
    const { getByText } = renderScreen();

    expect(getByText(/Enter the password for a@b.com/i)).toBeTruthy();
  });
});

describe("DeleteAccountScreen, before it will do anything", () => {
  it("does nothing while the password field is empty", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { getByText } = renderScreen();

    fireEvent.press(getByText("Delete my account"));

    // A destructive action must not be reachable by one mistap on a screen the
    // user may have opened to read rather than to act.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("asks for confirmation even once a password is typed", async () => {
    // Two steps on purpose: the password proves who they are, the confirmation
    // proves they meant to. Someone can type a password out of habit.
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "hunter2");

    const alertSpy = await confirmDeletion(getByText);

    expect(alertSpy).toHaveBeenCalled();
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith("hunter2"));
  });

  it("deletes nothing when the confirmation is cancelled", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "hunter2");

    fireEvent.press(getByText("Delete my account"));
    const buttons = alertSpy.mock.calls[0]?.[2] as { text?: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Cancel")?.onPress?.();

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});

describe("DeleteAccountScreen, when the deletion fails", () => {
  it("shows the reason on the screen, where it stays visible", async () => {
    // On screen rather than in an alert, so it is still readable while they
    // retype the password.
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      failedAt: "your password",
      anythingDeleted: false,
      message: "That password is not right. Try again.",
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "wrong");
    await confirmDeletion(getByText);

    await waitFor(() => expect(getByText(/That password is not right/i)).toBeTruthy());
  });

  it("clears the password field so the wrong one is not silently resubmitted", async () => {
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      failedAt: "your password",
      anythingDeleted: false,
      message: "That password is not right. Try again.",
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "wrong");
    await confirmDeletion(getByText);

    await waitFor(() => expect(getByLabelText("Password").props.value).toBe(""));
  });

  it("leaves the user on the screen so they can try again", async () => {
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      failedAt: "your account record",
      anythingDeleted: true,
      message: "Some of your data was deleted, but this was not: your account record.",
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "hunter2");
    await confirmDeletion(getByText);

    await waitFor(() => expect(getByText(/Some of your data was deleted/i)).toBeTruthy());
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe("DeleteAccountScreen, when the deletion works", () => {
  it("does not navigate, because losing the session does that on its own", async () => {
    // Deleting the account ends the session, the listener in useAuth notices,
    // and RootNavigator swaps the whole signed-in stack for the login screen
    // (33.2). Navigating here would race that.
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "hunter2");
    await confirmDeletion(getByText);

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("shows no error", async () => {
    const { getByText, getByLabelText, queryByText } = renderScreen();
    fireEvent.changeText(getByLabelText("Password"), "hunter2");
    await confirmDeletion(getByText);

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());
    expect(queryByText(/not right/i)).toBeNull();
    expect(queryByText(/still exists/i)).toBeNull();
  });
});
