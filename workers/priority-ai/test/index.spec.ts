import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";

describe("SwiftChoice Priority AI worker", () => {
  it("returns the service health status", async () => {
    const request = new Request("http://example.com/health");

    const response = await worker.fetch(request, {
      GEMINI_API_KEY: "test-key",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "SwiftChoice Priority AI",
    });
  });

  it("rejects a tie-break request containing fewer than two tasks", async () => {
    const request = new Request("http://example.com/tie-break", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: [
          {
            taskId: 1,
            taskName: "Only task",
          },
        ],
      }),
    });

    const response = await worker.fetch(request, {
      GEMINI_API_KEY: "test-key",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Submit between 2 and 8 tied tasks.",
    });
  });

  it("returns 404 for an unknown route", async () => {
    const request = new Request("http://example.com/unknown");

    const response = await worker.fetch(request, {
      GEMINI_API_KEY: "test-key",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Route not found.",
    });
  });

  it("serves the health route through the Worker integration environment", async () => {
    const response = await SELF.fetch("https://example.com/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "SwiftChoice Priority AI",
    });
  });
});