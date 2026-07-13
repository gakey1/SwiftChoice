// Tests for the Priority screen. The icon set and navigation are stubbed so it
// renders under Jest. These exercise Tracy's task logic through the new UI:
// adding a task, ranking, and completing. The gamification layer is presentation
// only, so the checks focus on the task behaviour it wraps.

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PriorityScreen } from "./PriorityScreen";

// Stub the native icon set so this test does not pull in expo-font / expo-asset.
jest.mock("@expo/vector-icons", () => ({ Feather: "Feather" }));

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

    fireEvent.press(getByText("Rank my tasks"));

    expect(getByText("Ranked by urgency + importance")).toBeTruthy();
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
});
