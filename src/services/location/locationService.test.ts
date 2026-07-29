// Tests for the location wrapper. expo-location is mocked so these run without a
// device: they check the three paths the app cares about - permission denied, a
// good fix, and granted-but-no-fix - and that each returns the tagged result
// shape rather than throwing.

import * as Location from "expo-location";

import { getCurrentPosition } from "./locationService";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockRequest = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetPosition = Location.getCurrentPositionAsync as jest.Mock;

describe("getCurrentPosition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the coordinates when permission is granted and a fix is available", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockGetPosition.mockResolvedValue({ coords: { latitude: -37.81, longitude: 144.96 } });

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: true, latitude: -37.81, longitude: 144.96 });
    // Never asks for the position when it does not need it.
    expect(mockGetPosition).toHaveBeenCalledTimes(1);
  });

  it("returns denied and never reads the position when permission is refused", async () => {
    mockRequest.mockResolvedValue({ granted: false });

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: false, reason: "denied" });
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it("returns denied when the permission request itself fails", async () => {
    mockRequest.mockRejectedValue(new Error("permission module unavailable"));

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: false, reason: "denied" });
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it("returns unavailable when granted but no fix comes back", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockGetPosition.mockRejectedValue(new Error("location unavailable"));

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });
});
