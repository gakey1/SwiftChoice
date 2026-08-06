import { requestPriorityAITieBreak } from "./priorityAI";
import type { PriorityTaskForRanking } from "./priorityRanking";

const tasks: PriorityTaskForRanking[] = [
  {
    taskId: 1,
    taskName: "Attend appointment",
    urgency: "High",
    importance: "High",
  },
  {
    taskId: 2,
    taskName: "Finish assignment",
    urgency: "High",
    importance: "High",
  },
];

const originalFetch = globalThis.fetch;

describe("requestPriorityAITieBreak", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_PRIORITY_AI_URL = "http://worker.test";
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_PRIORITY_AI_URL;
    jest.restoreAllMocks();
  });

  it("returns a validated AI tie-break result", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        orderedTaskIds: [1, 2],
        reason: "The appointment is a fixed commitment.",
      }),
    } as Response);

    const result = await requestPriorityAITieBreak(tasks);

    expect(result).toEqual({
      orderedTaskIds: [1, 2],
      reason: "The appointment is a fixed commitment.",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://worker.test/tie-break",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("returns null when the Worker request fails", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Unavailable",
      }),
    } as Response);

    await expect(requestPriorityAITieBreak(tasks)).resolves.toBeNull();
  });

  it("rejects a response containing unknown task IDs", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        orderedTaskIds: [1, 999],
        reason: "Invalid result",
      }),
    } as Response);

    await expect(requestPriorityAITieBreak(tasks)).resolves.toBeNull();
  });

  it("returns null when the Worker URL is not configured", async () => {
    delete process.env.EXPO_PUBLIC_PRIORITY_AI_URL;

    await expect(requestPriorityAITieBreak(tasks)).resolves.toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});