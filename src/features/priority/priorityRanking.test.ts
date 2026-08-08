import {
  findScoreTieGroups,
  getPriorityScore,
  rankTasksWithoutAI,
  type PriorityTaskForRanking,
} from "./priorityRanking";

function task(
  overrides: Partial<PriorityTaskForRanking> = {},
): PriorityTaskForRanking {
  return {
    taskId: 1,
    taskName: "Example task",
    urgency: "Medium",
    importance: "Medium",
    ...overrides,
  };
}

describe("priorityRanking", () => {
  describe("getPriorityScore", () => {
    it("adds urgency and importance points", () => {
      expect(
        getPriorityScore(
          task({
            urgency: "High",
            importance: "Medium",
          }),
        ),
      ).toBe(5);
    });
  });

  describe("rankTasksWithoutAI", () => {
    it("places higher-scoring tasks first", () => {
      const low = task({
        taskId: 1,
        taskName: "Low task",
        urgency: "Low",
        importance: "Low",
      });

      const high = task({
        taskId: 2,
        taskName: "High task",
        urgency: "High",
        importance: "High",
      });

      const ranked = rankTasksWithoutAI([low, high]);

      expect(ranked.map((item) => item.taskId)).toEqual([2, 1]);
    });

    it("uses the earlier deadline when scores are tied", () => {
      const later = task({
        taskId: 1,
        deadline: "2026-08-20T10:00:00.000Z",
      });

      const earlier = task({
        taskId: 2,
        deadline: "2026-08-10T10:00:00.000Z",
      });

      const ranked = rankTasksWithoutAI([later, earlier]);

      expect(ranked.map((item) => item.taskId)).toEqual([2, 1]);
    });

    it("places a task with a deadline before one without a deadline", () => {
      const noDeadline = task({
        taskId: 1,
        deadline: null,
      });

      const withDeadline = task({
        taskId: 2,
        deadline: "2026-08-10T10:00:00.000Z",
      });

      const ranked = rankTasksWithoutAI([noDeadline, withDeadline]);

      expect(ranked.map((item) => item.taskId)).toEqual([2, 1]);
    });

    it("uses the oldest creation date when deadlines do not separate the tasks", () => {
      const newer = task({
        taskId: 1,
        createdAt: "2026-08-05T10:00:00.000Z",
      });

      const older = task({
        taskId: 2,
        createdAt: "2026-08-01T10:00:00.000Z",
      });

      const ranked = rankTasksWithoutAI([newer, older]);

      expect(ranked.map((item) => item.taskId)).toEqual([2, 1]);
    });

    it("uses task ID as the final stable fallback", () => {
      const second = task({ taskId: 2 });
      const first = task({ taskId: 1 });

      const ranked = rankTasksWithoutAI([second, first]);

      expect(ranked.map((item) => item.taskId)).toEqual([1, 2]);
    });

    it("does not mutate the original array", () => {
      const original = [
        task({
          taskId: 1,
          urgency: "Low",
          importance: "Low",
        }),
        task({
          taskId: 2,
          urgency: "High",
          importance: "High",
        }),
      ];

      rankTasksWithoutAI(original);

      expect(original.map((item) => item.taskId)).toEqual([1, 2]);
    });
  });

  describe("findScoreTieGroups", () => {
    it("returns only score groups containing more than one task", () => {
      const tasks = [
        task({
          taskId: 1,
          urgency: "High",
          importance: "High",
        }),
        task({
          taskId: 2,
          urgency: "High",
          importance: "High",
        }),
        task({
          taskId: 3,
          urgency: "Low",
          importance: "Low",
        }),
      ];

      const groups = findScoreTieGroups(tasks);

      expect(groups).toHaveLength(1);
      expect(groups[0]!.map((item) => item.taskId)).toEqual([1, 2]);
    });

    it("returns tied groups from highest score to lowest score", () => {
      const tasks = [
        task({
          taskId: 1,
          urgency: "Low",
          importance: "Low",
        }),
        task({
          taskId: 2,
          urgency: "Low",
          importance: "Low",
        }),
        task({
          taskId: 3,
          urgency: "High",
          importance: "High",
        }),
        task({
          taskId: 4,
          urgency: "High",
          importance: "High",
        }),
      ];

      const groups = findScoreTieGroups(tasks);

      expect(groups.map((group) => group.map((item) => item.taskId))).toEqual([
        [3, 4],
        [1, 2],
      ]);
    });
  });
});