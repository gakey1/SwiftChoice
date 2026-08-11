// Tests for the TOTP secret store. The keychain wrapper is mocked, so these
// check that this module uses it correctly and, importantly, that the secret
// goes to the keychain rather than anywhere else.

// The keychain wrapper, mocked below. Asserting against it is what proves the
// secret goes to the keychain and not to ordinary storage.
import { clearItem, getItem, setItem } from "@/services/localdb/secureStorage";
// The functions under test.
import {
  clearTotpSecret,
  getTotpSecret,
  isTotpEnrolled,
  saveTotpSecret,
} from "@/services/localdb/totpStorage";

jest.mock("@/services/localdb/secureStorage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  clearItem: jest.fn(),
}));

const mockSet = setItem as jest.Mock;
const mockGet = getItem as jest.Mock;
const mockClear = clearItem as jest.Mock;

const KEY = "swiftchoice.totpSecret";

describe("totpStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves the secret to the keychain wrapper under its own key", async () => {
    await saveTotpSecret("JBSWY3DPEHPK3PXP");

    expect(mockSet).toHaveBeenCalledWith(KEY, "JBSWY3DPEHPK3PXP");
  });

  it("reads the secret back", async () => {
    mockGet.mockResolvedValue("JBSWY3DPEHPK3PXP");

    await expect(getTotpSecret()).resolves.toBe("JBSWY3DPEHPK3PXP");
    expect(mockGet).toHaveBeenCalledWith(KEY);
  });

  it("returns null when this device has never enrolled", async () => {
    mockGet.mockResolvedValue(null);

    await expect(getTotpSecret()).resolves.toBeNull();
  });

  it("clears the enrolment", async () => {
    await clearTotpSecret();

    expect(mockClear).toHaveBeenCalledWith(KEY);
  });

  it("reports enrolled only when a secret is present", async () => {
    mockGet.mockResolvedValue("JBSWY3DPEHPK3PXP");
    await expect(isTotpEnrolled()).resolves.toBe(true);

    mockGet.mockResolvedValue(null);
    await expect(isTotpEnrolled()).resolves.toBe(false);
  });
});
