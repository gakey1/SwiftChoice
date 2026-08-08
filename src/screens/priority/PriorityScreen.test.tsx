// Tests for the Priority screen. The icon set and navigation are stubbed so it
// renders under Jest. These exercise Tracy's task logic through the new UI:
// adding a task, ranking, and completing. The gamification layer is presentation
// only, so the checks focus on the task behaviour it wraps.

import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";
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

  it("ranks tasks and shows the ranked status", () => {
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
    act(() => {
      confirm?.onPress?.();
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
