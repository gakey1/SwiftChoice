// Tests for the data and privacy screen.
//
// These are unusual in that they assert on wording. That is deliberate: the
// whole value of this screen is that it is accurate, and an accurate screen
// that quietly drifts out of date is worse than none, because it looks checked
// and is not. So the three things that leave the phone are pinned by name, and
// so are the two claims that would be untrue if softened.

import { fireEvent, render } from "@testing-library/react-native";

import { DataAndPrivacyScreen } from "@/screens/settings/DataAndPrivacyScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/components/Icon", () => ({ Icon: () => null }));
jest.mock("@/components/AmbientBackground", () => ({ AmbientBackground: () => null }));

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

function renderScreen() {
  return render(
    <ThemeProvider>
      <DataAndPrivacyScreen
        navigation={navigation as never}
        route={{ key: "DataAndPrivacy", name: "DataAndPrivacy" } as never}
      />
    </ThemeProvider>
  );
}

describe("DataAndPrivacyScreen", () => {
  it("names all three things that leave the phone", () => {
    // If a fourth is ever added to the app and not to this screen, the screen
    // becomes a false statement rather than an incomplete one.
    const { getByText } = renderScreen();

    expect(getByText("A decision you accept")).toBeTruthy();
    expect(getByText("Your location, or an area you type")).toBeTruthy();
    expect(getByText("Your location")).toBeTruthy();
  });

  it("names where each one goes", () => {
    const { getByText } = renderScreen();

    expect(getByText("Your SwiftChoice account")).toBeTruthy();
    expect(getByText("Google")).toBeTruthy();
    expect(getByText("A weather service")).toBeTruthy();
  });

  it("says the weather check runs on every Focus recommendation", () => {
    // It used to run only for outdoor spots. Wording left over from that would
    // understate what the app collects, which is the wrong way to be wrong.
    const { getByText } = renderScreen();

    expect(getByText(/Each Focus recommendation/i)).toBeTruthy();
  });

  it("admits the weather is for the phone, not the spot", () => {
    // A spot has no coordinates. Implying otherwise would be a claim we cannot
    // support, on the screen where being trusted is the entire point.
    const { getByText } = renderScreen();

    expect(getByText(/for where your\s+phone is, not for the spot/i)).toBeTruthy();
  });

  it("says the cloud copy survives clearing data on the phone", () => {
    const { getByText } = renderScreen();

    expect(getByText(/stay there until the account itself is deleted/i)).toBeTruthy();
  });

  it("links to both full documents", () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText("Privacy policy"));
    expect(navigation.navigate).toHaveBeenCalledWith("Legal", { document: "privacy" });

    fireEvent.press(getByText("Terms of use"));
    expect(navigation.navigate).toHaveBeenCalledWith("Legal", { document: "terms" });
  });

  it("lists what stays on the device, so silence is not mistaken for secrecy", () => {
    const { getByText } = renderScreen();

    expect(getByText("Your Fuel and Focus pools")).toBeTruthy();
    expect(getByText(/two-factor key, which is why it only protects this phone/i)).toBeTruthy();
  });
});
