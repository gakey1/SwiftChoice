import { requestPriorityAITieBreak } from "./priorityAI";
import { rankTasksWithAI } from "./priorityAIRanking";
import type { PriorityTaskForRanking } from "./priorityRanking";

jest.mock("./priorityAI", () => ({
  requestPriorityAITieBreak: jest.fn(),
}));

const mockedTieBreak =
  requestPriorityAITieBreak as jest.MockedFunction<
    typeof requestPriorityAITieBreak
  >;

beforeEach(() => {
  mockedTieBreak.mockReset();
});

describe("rankTasksWithAI", () => {
  test("applies AI order to tasks still tied after score and deadline", async () => {
    const tasks: PriorityTaskForRanking[] = [
      {
        taskId: 1,
        taskName: "Finish assignment",
        urgency: "High",
        importance: "High",
        createdAt: "2026-08-06T09:00:00Z",
      },
      {
        taskId: 2,
        taskName: "Attend appointment",
        urgency: "High",
        importance: "High",
        createdAt: "2026-08-06T10:00:00Z",
      },
    ];

    mockedTieBreak.mockResolvedValue({
      orderedTaskIds: [2, 1],
      reason: "The appointment has a fixed time commitment.",
    });

    const result = await rankTasksWithAI(tasks);

    expect(result.tasks.map((task) => task.taskId)).toEqual([2, 1]);
    expect(result.aiReasons).toEqual([
      "The appointment has a fixed time commitment.",
    ]);
    expect(mockedTieBreak).toHaveBeenCalledWith(tasks);
  });

  test("uses earlier deadline before AI and does not send that group", async () => {
    const tasks: PriorityTaskForRanking[] = [
      {
        taskId: 1,
        taskName: "Task due tomorrow",
        urgency: "High",
        importance: "High",
        deadline: "2026-08-07T09:00:00Z",
      },
      {
        taskId: 2,
        taskName: "Task due next week",
        urgency: "High",
        importance: "High",
        deadline: "2026-08-13T09:00:00Z",
      },
    ];

    const result = await rankTasksWithAI(tasks);

    expect(result.tasks.map((task) => task.taskId)).toEqual([1, 2]);
    expect(result.aiReasons).toEqual([]);
    expect(mockedTieBreak).not.toHaveBeenCalled();
  });

  test("keeps deterministic fallback when AI is unavailable", async () => {
    const tasks: PriorityTaskForRanking[] = [
      {
        taskId: 2,
        taskName: "Newer task",
        urgency: "Medium",
        importance: "Medium",
        createdAt: "2026-08-06T10:00:00Z",
      },
      {
        taskId: 1,
        taskName: "Older task",
        urgency: "Medium",
        importance: "Medium",
        createdAt: "2026-08-06T09:00:00Z",
      },
    ];

    mockedTieBreak.mockResolvedValue(null);

    const result = await rankTasksWithAI(tasks);

    expect(result.tasks.map((task) => task.taskId)).toEqual([1, 2]);
    expect(result.aiReasons).toEqual([]);
  });

  test("still ranks higher scores above AI-resolved tie groups", async () => {
    const tasks: PriorityTaskForRanking[] = [
      {
        taskId: 1,
        taskName: "Highest score",
        urgency: "High",
        importance: "High",
      },
      {
        taskId: 2,
        taskName: "Medium tie A",
        urgency: "Medium",
        importance: "Medium",
      },
      {
        taskId: 3,
        taskName: "Medium tie B",
        urgency: "Medium",
        importance: "Medium",
      },
    ];

    mockedTieBreak.mockResolvedValue({
      orderedTaskIds: [3, 2],
      reason: "Task B has the clearer immediate next action.",
    });

    const result = await rankTasksWithAI(tasks);

    expect(result.tasks.map((task) => task.taskId)).toEqual([1, 3, 2]);
    expect(result.aiReasons).toEqual([
      "Task B has the clearer immediate next action.",
    ]);
  });
});