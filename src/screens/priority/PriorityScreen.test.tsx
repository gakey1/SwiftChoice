// Tests for the Priority screen. The icon set and navigation are stubbed so it
// renders under Jest. These exercise the task logic through the UI: adding a
// task, ranking, and completing. The gamification layer is presentation only,
// so the checks focus on the task behaviour it wraps.

import React from "react";
// Renders the screen, drives it, and flushes the state updates it causes.
import { render, fireEvent, act } from "@testing-library/react-native";
// Spied on, since completing and clearing both go through a confirmation.
import { Alert } from "react-native";
// The screen under test.
import { PriorityScreen } from "./PriorityScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset.
// Completing a task now writes to the decision history, which reaches Firestore
// and expo-sqlite through this module. Mocked so the screen test does not pull
// that chain in. This is the fourth time this exact trap has appeared (MC-007):
// any screen that gains a storage import needs its test mocked in the same move,
// or the suite fails to load with a Firebase syntax error that names none of it.
jest.mock("@/features/history/historyStorage", () => ({
  logDecision: jest.fn().mockResolvedValue(undefined),
}));

// The board is persisted now, so the screen reaches the task store on mount and
// on every change. Real AsyncStorage is already mocked globally; this spies on
// the store itself so a test can say what was on the device when the screen
// opened, which is the only way to exercise the hydration guard.
// The rank confirmation names the tie-break only when one is configured, so
// the test has to be able to say which.
// requireActual, not a bare replacement: priorityAIRanking imports
// requestPriorityAITieBreak out of this same module, so stubbing the whole
// thing leaves the ranking calling undefined and takes an unrelated test down
// with it.
jest.mock("@/features/priority/priorityAI", () => ({
  ...jest.requireActual("@/features/priority/priorityAI"),
  isPriorityTieBreakEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock("@/services/localdb/taskStorage", () => ({
  loadTaskBoard: jest.fn().mockResolvedValue({ tasks: [], isRanked: false, reasons: [] }),
  saveTaskBoard: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

// Mock the useNavigation hook from React Navigation.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

describe("PriorityScreen", () => {
  it("renders the header, composer and empty state", () => {
    const { getByText, getByPlaceholderText } = render(<PriorityScreen />);

    expect(getByText("Priority")).toBeTruthy();
    expect(getByText("What should you do first?")).toBeTruthy();
    expect(getByText("Urgency")).toBeTruthy();
    expect(getByText("Importance")).toBeTruthy();
    expect(getByPlaceholderText("Add a new task")).toBeTruthy();
    expect(getByText(/All clear/i)).toBeTruthy();
  });

  it("adds a typed task to the list", () => {
    const { getByPlaceholderText, getByLabelText, getByText, queryByText } = render(
      <PriorityScreen />
    );

    expect(queryByText("Write essay")).toBeNull();

    fireEvent.changeText(getByPlaceholderText("Add a new task"), "Write essay");
    fireEvent.press(getByLabelText("Add task"));

    expect(getByText("Write essay")).toBeTruthy();
    // One task added -> the status pill shows the unsorted count.
    expect(getByText("Unsorted")).toBeTruthy();
    expect(getByText("1 task")).toBeTruthy();
  });

  it("does not add an empty task", () => {
    const { getByLabelText, getByText } = render(<PriorityScreen />);

    fireEvent.press(getByLabelText("Add task"));

    // Still empty; the empty state remains.
    expect(getByText(/All clear/i)).toBeTruthy();
  });

  it("ranks tasks and shows the ranked status", async () => {
    const { getByPlaceholderText, getByLabelText, getByText } = render(<PriorityScreen />);

    const input = getByPlaceholderText("Add a new task");
    fireEvent.changeText(input, "Task A");
    fireEvent.press(getByLabelText("Add task"));
    fireEvent.changeText(input, "Task B");
    fireEvent.press(getByLabelText("Add task"));

    expect(getByText("Unsorted")).toBeTruthy();

    // Ranking now asks the user to confirm before it locks the order in. The
    // confirmation is a native alert, which renders nothing this test can query,
    // so we read the buttons the screen handed to Alert and run the confirming
    // one. That is the same code path as tapping "Rank them" on a device.
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    fireEvent.press(getByText("Rank my tasks"));
    expect(alertSpy).toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0]?.[2];
    const confirm = buttons?.find((button) => button.text === "Rank them");
    // Ranking is asynchronous now: it asks the tie-break Worker first and falls
    // back to the deterministic order. The awaited act is what lets the state
    // land before the label is read, and without it this asserts on the frame
    // before the ranking finishes. No network happens here, because with no
    // EXPO_PUBLIC_PRIORITY_AI_URL set the request is skipped outright.
    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(getByText("Ranked by urgency + importance")).toBeTruthy();

    alertSpy.mockRestore();
  });

  it("leaves tasks unsorted if the rank confirmation is dismissed", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByPlaceholderText, getByLabelText, getByText } = render(<PriorityScreen />);

    const input = getByPlaceholderText("Add a new task");
    fireEvent.changeText(input, "Task A");
    fireEvent.press(getByLabelText("Add task"));
    fireEvent.changeText(input, "Task B");
    fireEvent.press(getByLabelText("Add task"));

    fireEvent.press(getByText("Rank my tasks"));

    // Backing out of the confirmation must not lock the order in, because
    // ranking is one way: once locked, tasks can no longer be edited or removed.
    expect(getByText("Unsorted")).toBeTruthy();

    alertSpy.mockRestore();
  });

  it("completes a task and removes it from the list", () => {
    const { getByPlaceholderText, getByLabelText, getByText, queryByText } = render(
      <PriorityScreen />
    );

    fireEvent.changeText(getByPlaceholderText("Add a new task"), "Do laundry");
    fireEvent.press(getByLabelText("Add task"));
    expect(getByText("Do laundry")).toBeTruthy();

    fireEvent.press(getByLabelText("Complete task"));

    expect(queryByText("Do laundry")).toBeNull();
  });

  it("does not delete a task on the first tap", () => {
    // Delete sits right beside Complete, so a mis-tap must not lose work. This
    // is the part that regresses silently, because the button still looks alive.
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByPlaceholderText, getByLabelText, getByText } = render(<PriorityScreen />);

    fireEvent.changeText(getByPlaceholderText("Add a new task"), "Wash the car");
    fireEvent.press(getByLabelText("Add task"));

    fireEvent.press(getByLabelText("Delete task"));

    expect(alertSpy).toHaveBeenCalled();
    // Still there. Nothing happened yet.
    expect(getByText("Wash the car")).toBeTruthy();

    alertSpy.mockRestore();
  });

  it("names the task it is about to delete", () => {
    // A generic "are you sure" does not tell somebody which task they are about
    // to lose when several are on screen.
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByPlaceholderText, getByLabelText } = render(<PriorityScreen />);

    fireEvent.changeText(getByPlaceholderText("Add a new task"), "Wash the car");
    fireEvent.press(getByLabelText("Add task"));
    fireEvent.press(getByLabelText("Delete task"));

    expect(String(alertSpy.mock.calls[0]?.[1])).toContain("Wash the car");

    alertSpy.mockRestore();
  });

  it("deletes only once the confirmation is accepted", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByPlaceholderText, getByLabelText, getByText, queryByText } = render(<PriorityScreen />);

    fireEvent.changeText(getByPlaceholderText("Add a new task"), "Wash the car");
    fireEvent.press(getByLabelText("Add task"));
    fireEvent.press(getByLabelText("Delete task"));

    const confirm = alertSpy.mock.calls[0]?.[2]?.find((button) => button.text === "Delete");
    act(() => {
      confirm?.onPress?.();
    });

    expect(queryByText("Wash the car")).toBeNull();
    // Back to the empty state, so the list really is gone rather than hidden.
    expect(getByText(/All clear/i)).toBeTruthy();

    alertSpy.mockRestore();
  });
});

// Completing a task writes to the decision history. Priority was the only module
// that never did, so a finished task earned XP and a badge but left no trace on
// the History screen and was missing from the Home count, which made the app
// disagree with itself about how many decisions had been made.
describe("PriorityScreen decision history", () => {
  function addAndComplete(name: string) {
    const utils = render(<PriorityScreen />);
    fireEvent.changeText(utils.getByPlaceholderText("Add a new task"), name);
    fireEvent.press(utils.getByLabelText("Add task"));
    fireEvent.press(utils.getByLabelText("Complete task"));
    return utils;
  }

  it("records a completed task as a decision", () => {
    const { logDecision } = jest.requireMock("@/features/history/historyStorage");
    logDecision.mockClear();

    addAndComplete("Finish the report");

    expect(logDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleType: "priority",
        itemSnapshot: expect.objectContaining({ name: "Finish the report" }),
      })
    );
  });

  it("records when the decision started, so the average is measurable", () => {
    const { logDecision } = jest.requireMock("@/features/history/historyStorage");
    logDecision.mockClear();

    addAndComplete("Email the tutor");

    const call = logDecision.mock.calls[0][0];
    expect(typeof call.startedAt).toBe("string");
    // Missing this is how the Home figure silently becomes a dash forever.
    expect(Number.isNaN(Date.parse(call.startedAt))).toBe(false);
  });

  it("still completes the task when the history write fails", () => {
    // Losing a history row must never cost somebody the XP and the animation
    // they have already been shown.
    const { logDecision } = jest.requireMock("@/features/history/historyStorage");
    logDecision.mockClear();
    logDecision.mockRejectedValueOnce(new Error("database unavailable"));

    const { queryByText } = addAndComplete("Read chapter 4");

    expect(queryByText("Read chapter 4")).toBeNull();
  });
});

// The board surviving the screen is the whole point of the store, and the guard
// against wiping it is the part that fails silently if it is wrong.
describe("PriorityScreen persistence", () => {
  const store = jest.requireMock("@/services/localdb/taskStorage") as {
    loadTaskBoard: jest.Mock;
    saveTaskBoard: jest.Mock;
  };

  const SAVED = {
    tasks: [
      {
        taskId: 7,
        userId: 1,
        taskName: "Finish the slides",
        urgency: "High" as const,
        importance: "High" as const,
        status: "Pending" as const,
      },
    ],
    isRanked: false,
    reasons: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store.loadTaskBoard.mockResolvedValue({ tasks: [], isRanked: false, reasons: [] });
  });

  it("shows a task that was on the device when the screen opened", async () => {
    store.loadTaskBoard.mockResolvedValue(SAVED);

    const view = render(<PriorityScreen />);
    await act(async () => {});

    expect(view.getByText("Finish the slides")).toBeTruthy();
  });

  it("does not overwrite the stored board before the load comes back", async () => {
    // The failure this guards against does not throw and does not look broken.
    // Without it the save fires on mount with the empty initial state, so the
    // screen erases the list every time it opens while appearing to work.
    let release: (board: typeof SAVED) => void = () => {};
    store.loadTaskBoard.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );

    render(<PriorityScreen />);
    await act(async () => {});

    expect(store.saveTaskBoard).not.toHaveBeenCalled();

    await act(async () => {
      release(SAVED);
    });
  });

  it("saves the board once a task is added", async () => {
    const view = render(<PriorityScreen />);
    await act(async () => {});
    store.saveTaskBoard.mockClear();

    fireEvent.changeText(view.getByPlaceholderText("Add a new task"), "Book the room");
    fireEvent.press(view.getByLabelText("Add task"));
    await act(async () => {});

    expect(store.saveTaskBoard).toHaveBeenCalled();
    const board = store.saveTaskBoard.mock.calls.at(-1)?.[0] as typeof SAVED;
    expect(board.tasks.map((t) => t.taskName)).toContain("Book the room");
  });
});

// What the confirmation says before anything is sent. A privacy policy in
// Settings is not a choice somebody was offered; this is the moment their own
// words are about to leave the phone.
describe("PriorityScreen tie-break consent", () => {
  const ai = jest.requireMock("@/features/priority/priorityAI") as {
    isPriorityTieBreakEnabled: jest.Mock;
  };

  function addOneTaskAndRank(): jest.SpyInstance {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = render(<PriorityScreen />);
    fireEvent.changeText(view.getByPlaceholderText("Add a new task"), "One");
    fireEvent.press(view.getByLabelText("Add task"));
    fireEvent.changeText(view.getByPlaceholderText("Add a new task"), "Two");
    fireEvent.press(view.getByLabelText("Add task"));
    fireEvent.press(view.getByText("Rank my tasks"));
    return alertSpy;
  }

  afterEach(() => {
    jest.restoreAllMocks();
    ai.isPriorityTieBreakEnabled.mockReturnValue(false);
  });

  it("warns that tied tasks go to Google when a tie-break is configured", () => {
    ai.isPriorityTieBreakEnabled.mockReturnValue(true);

    const alertSpy = addOneTaskAndRank();

    expect(String(alertSpy.mock.calls[0]?.[1])).toMatch(/sent to Google/i);
  });

  it("says nothing about Google when no tie-break is configured", () => {
    // Nothing is sent in that state, and warning about a request the app is not
    // making is its own kind of dishonest.
    ai.isPriorityTieBreakEnabled.mockReturnValue(false);

    const alertSpy = addOneTaskAndRank();

    expect(String(alertSpy.mock.calls[0]?.[1])).not.toMatch(/Google/i);
  });
});
