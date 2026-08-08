// Tests for the privacy policy and terms of use (US34).
//
// Most of these assert what the documents do NOT say. That is the point: the
// risk with a policy written for a student project is not leaving something out,
// it is claiming something nobody has done. Compliance with a named law, a
// retention period, a security standard, a company behind it. Each of those
// would be an outright falsehood, and each is cheap to add by accident later.

import { render } from "@testing-library/react-native";

import { LegalScreen } from "@/screens/settings/LegalScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/components/AmbientBackground", () => ({ AmbientBackground: () => null }));

const navigation = { goBack: jest.fn() };

function renderDocument(document: "privacy" | "terms") {
  return render(
    <ThemeProvider>
      <LegalScreen
        navigation={navigation as never}
        route={{ key: "Legal", name: "Legal", params: { document } } as never}
      />
    </ThemeProvider>
  );
}

describe("the privacy policy", () => {
  it("says plainly that this is coursework, not a commercial service", () => {
    const { getByText } = renderDocument("privacy");

    expect(getByText("Privacy policy")).toBeTruthy();
    expect(getByText(/university project built by three students/i)).toBeTruthy();
  });

  it("names all three destinations data reaches", () => {
    const { getByText } = renderDocument("privacy");

    expect(getByText(/held in Google Firebase in Sydney/i)).toBeTruthy();
    expect(getByText(/sent to Google so it can return places nearby/i)).toBeTruthy();
    expect(getByText(/sent to a weather service/i)).toBeTruthy();
  });

  it("claims compliance with no law, because nobody has assessed it against one", () => {
    const { queryByText } = renderDocument("privacy");

    expect(queryByText(/GDPR/i)).toBeNull();
    expect(queryByText(/Privacy Act/i)).toBeNull();
    expect(queryByText(/compliant/i)).toBeNull();
  });

  it("promises no retention period, since nothing enforces one", () => {
    const { queryByText } = renderDocument("privacy");

    expect(queryByText(/we (keep|retain|delete) .* (days|months|years)/i)).toBeNull();
  });

  it("states what is absent as fact rather than as a promise", () => {
    // "There is no advertising code" is checkable. "We will never advertise" is
    // a promise a student project is in no position to make.
    const { getByText, queryByText } = renderDocument("privacy");

    expect(getByText(/contains no advertising and no analytics or tracking code/i)).toBeTruthy();
    expect(queryByText(/we will never/i)).toBeNull();
  });
});

describe("the terms of use", () => {
  it("says the recommendations are suggestions rather than advice", () => {
    const { getByText } = renderDocument("terms");

    expect(getByText("Terms of use")).toBeTruthy();
    expect(getByText(/not professional, dietary, health or financial advice/i)).toBeTruthy();
  });

  it("warns that outside information can be wrong, because we do not check it", () => {
    const { getByText } = renderDocument("terms");

    expect(getByText(/opening hours, prices and forecasts can be wrong/i)).toBeTruthy();
  });

  it("makes no availability promise", () => {
    const { getByText } = renderDocument("terms");

    expect(getByText(/may be unavailable, and information you store in it may be lost/i)).toBeTruthy();
  });

  it("says the service is not permanent, which is true of coursework", () => {
    const { getByText } = renderDocument("terms");

    expect(getByText(/may stop after the unit ends/i)).toBeTruthy();
  });
});
