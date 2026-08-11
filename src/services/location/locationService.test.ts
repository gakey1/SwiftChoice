// Tests for the location wrapper. expo-location is mocked so these run without a
// device: they check the three paths the app cares about - permission denied, a
// good fix, and granted-but-no-fix - and that each returns the tagged result
// shape rather than throwing.

// The platform API, mocked below so these run without a device.
import * as Location from "expo-location";

// The function under test.
import { getCurrentPosition } from "./locationService";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

// Typed handles on the mocks, so each case can choose which tier answers.
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

  // The tier that exists so a slightly old position beats no position. The
  // mock answers by age: nothing recent enough for the fast path, something
  // within the wider last-resort window.
  const RECENT_WINDOW_MS = 5 * 60 * 1000;
  function cacheOnlyHasAnOlderFix() {
    mockLastKnown.mockImplementation(async (options: { maxAge: number }) =>
      options.maxAge > RECENT_WINDOW_MS
        ? { coords: { latitude: -37.911247, longitude: 145.35714 } }
        : null
    );
  }

  it("uses an older cached fix rather than giving up when no fresh fix arrives", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    cacheOnlyHasAnOlderFix();
    mockGetPosition.mockRejectedValue(new Error("location unavailable"));

    const result = await getCurrentPosition();

    expect(result).toEqual({
      ok: true,
      latitude: -37.911247,
      longitude: 145.35714,
      stale: true,
    });
  });

  it("marks an older fix as stale so callers do not present it as the current position", async () => {
    // The flag is the whole point of the tier: a position that may be a suburb
    // out must not be shown as "near you" without saying so.
    mockRequest.mockResolvedValue({ granted: true });
    cacheOnlyHasAnOlderFix();
    mockGetPosition.mockRejectedValue(new Error("location unavailable"));

    const result = await getCurrentPosition();

    expect(result.ok).toBe(true);
    expect(result.ok && result.stale).toBe(true);
  });

  it("prefers a fresh fix over an older cached one, and does not mark it stale", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    cacheOnlyHasAnOlderFix();
    mockGetPosition.mockResolvedValue({ coords: { latitude: -37.81, longitude: 144.96 } });

    const result = await getCurrentPosition();

    // No stale key at all, not merely a falsy one: the ordinary paths keep the
    // shape they have always had.
    expect(result).toEqual({ ok: true, latitude: -37.81, longitude: 144.96 });
  });

  it("still reports unavailable when there is no fix at any age", async () => {
    // Guards against the older tier turning a genuine "we do not know" into a
    // confident answer. Nothing cached, nothing fresh, so the screen must ask.
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockResolvedValue(null);
    mockGetPosition.mockRejectedValue(new Error("location unavailable"));

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports unavailable when reading the older fix throws as well", async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockLastKnown.mockRejectedValue(new Error("cache unavailable"));
    mockGetPosition.mockRejectedValue(new Error("location unavailable"));

    const result = await getCurrentPosition();

    expect(result).toEqual({ ok: false, reason: "unavailable" });
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
