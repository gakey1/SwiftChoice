// Tests for the Priority task board store.
//
// The validation cases carry most of the weight. A board is read back from a
// store anybody can corrupt, and the failure that matters is not an exception,
// it is a half-built task reaching the screen where a missing urgency sorts as
// undefined rather than failing loudly.

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  EMPTY_BOARD,
  clearTaskBoard,
  loadTaskBoard,
  saveTaskBoard,
} from "@/services/localdb/taskStorage";
import type { StoredTask } from "@/services/localdb/taskStorage";

const KEY = "swiftchoice.priorityBoard";

const TASK: StoredTask = {
  taskId: 1,
  userId: 1,
  taskName: "Submit the report",
  urgency: "High",
  importance: "High",
  status: "Pending",
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("loadTaskBoard", () => {
  it("returns an empty board when nothing is stored", async () => {
    expect(await loadTaskBoard()).toEqual(EMPTY_BOARD);
  });

  it("round-trips a saved board", async () => {
    const board = { tasks: [TASK], isRanked: true, reasons: ["Because it is due first."] };
    await saveTaskBoard(board);
    expect(await loadTaskBoard()).toEqual(board);
  });

  it("drops a malformed task rather than the whole board", async () => {
    // Losing one row beats losing the list, which is the reason this filters
    // instead of rejecting outright.
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ tasks: [TASK, { taskId: 2, taskName: "" }], isRanked: false, reasons: [] })
    );

    const board = await loadTaskBoard();

    expect(board.tasks).toEqual([TASK]);
  });

  it("rejects a task whose urgency is not one of the three levels", async () => {
    // The one that would not throw anywhere: it sorts as undefined and the
    // ranking quietly comes out wrong.
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ tasks: [{ ...TASK, urgency: "Urgent" }], isRanked: false, reasons: [] })
    );

    expect((await loadTaskBoard()).tasks).toEqual([]);
  });

  it("refuses to call an empty board ranked", async () => {
    // Otherwise the screen restores into a state that offers no way forward:
    // ranked, so it will not rank, and empty, so there is nothing to show.
    await AsyncStorage.setItem(KEY, JSON.stringify({ tasks: [], isRanked: true, reasons: ["x"] }));

    const board = await loadTaskBoard();

    expect(board.isRanked).toBe(false);
    expect(board.reasons).toEqual([]);
  });

  it("drops the reasons when the board is not ranked", async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ tasks: [TASK], isRanked: false, reasons: ["stale"] })
    );

    expect((await loadTaskBoard()).reasons).toEqual([]);
  });

  it("falls back to empty on unparseable JSON rather than throwing", async () => {
    await AsyncStorage.setItem(KEY, "{ not json");

    expect(await loadTaskBoard()).toEqual(EMPTY_BOARD);
  });

  it("falls back to empty when the store itself fails", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("unavailable"));

    expect(await loadTaskBoard()).toEqual(EMPTY_BOARD);
  });
});

describe("saveTaskBoard", () => {
  it("does not throw when the store fails, since persistence is best-effort", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("full"));

    await expect(saveTaskBoard({ tasks: [TASK], isRanked: false, reasons: [] })).resolves
      .toBeUndefined();
  });
});

describe("clearTaskBoard", () => {
  it("forgets the board", async () => {
    await saveTaskBoard({ tasks: [TASK], isRanked: false, reasons: [] });

    await clearTaskBoard();

    expect(await loadTaskBoard()).toEqual(EMPTY_BOARD);
  });

  it("does not throw when the store fails, so the rest of a wipe continues", async () => {
    jest.spyOn(AsyncStorage, "removeItem").mockRejectedValueOnce(new Error("unavailable"));

    await expect(clearTaskBoard()).resolves.toBeUndefined();
  });
});
