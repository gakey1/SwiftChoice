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
  getLastKnownPositionAsync: jest.fn(),
}));

const mockRequest = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetPosition = Location.getCurrentPositionAsync as jest.Mock;
const mockLastKnown = Location.getLastKnownPositionAsync as jest.Mock;

describe("getCurrentPosition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Most tests care about the fresh-fix path, so the cache is empty unless a
    // test says otherwise.
    mockLastKnown.mockResolvedValue(null);
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

  it("uses a recent cached fix without waiting for a fresh one", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockResolvedValue({ coords: { latitude: -37.9, longitude: 145.35 } });

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: true, latitude: -37.9, longitude: 145.35 });
    // The point of the cache is that the slow call never happens.
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it("falls back to a fresh fix when the cache is empty", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockResolvedValue(null);
    mockGetPosition.mockResolvedValue({ coords: { latitude: -37.81, longitude: 144.96 } });

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: true, latitude: -37.81, longitude: 144.96 });
    expect(mockGetPosition).toHaveBeenCalled();
  });

  it("carries on to a fresh fix when reading the cache throws", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockRejectedValue(new Error("cache unavailable"));
    mockGetPosition.mockResolvedValue({ coords: { latitude: -37.81, longitude: 144.96 } });

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: true, latitude: -37.81, longitude: 144.96 });
  });

  it("gives up rather than waiting forever for a fix that never arrives", async () => {
    // The defect this guards. With no time limit the call waits as long as the
    // operating system takes, which indoors or on an emulator with no location
    // set is tens of seconds or never, and the screen shows nothing at all in
    // the meantime, so the app looks frozen instead of busy.
    jest.useFakeTimers();
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockResolvedValue(null);
    // Never settles, which is exactly the real-world case.
    mockGetPosition.mockReturnValue(new Promise(() => {}));

    const pending = getCurrentPosition();
    await jest.advanceTimersByTimeAsync(6000);

    await expect(pending).resolves.toEqual({ ok: false, reason: "unavailable" });
    jest.useRealTimers();
  });
});
