// Priority module screen. You add tasks with an urgency and an importance, then
// tap "Rank my tasks" to sort them so you know what to do first. The screen wears
// the Arcade look (dark/light theme, DM Mono on the coded stats), with a light
// gamification layer on top: an XP bar, levels, and small confetti + toast
// rewards that react to what you do.
//
// IMPORTANT: the decision logic below - the Task type, addTask, completeTask and
// handleRankTasks (Tracy's US22-24 work) - is kept exactly as she wrote it. The
// gamification is a separate presentation-only layer (awardXp / celebrate) that
// reacts to those actions; it never changes what her functions do.
// IMPORTANT: Tracy's Priority screen and task-management flow remain intact.
// The ranking handler now integrates Bikash's assigned tie-breaking feature.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { GameIcon } from "@/components/GameIcon";
import { GlassCard } from "@/components/GlassCard";
import { Icon } from "@/components/Icon";
import { HUD_CLEARANCE } from "@/components/XpHud";
import { useCelebration } from "@/components/Celebration";
import type { AppStackParamList } from "@/navigation/types";
import { logDecision } from "@/features/history/historyStorage";
import { useDecisionStart } from "@/features/history/useDecisionStart";
import { coreAchievements, earnedFirst } from "@/features/progress/achievements";
import { capFor, levelTitle, xpFraction } from "@/features/progress/progress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { moduleAccent, moduleDeep } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";
import { isPriorityTieBreakEnabled } from "@/features/priority/priorityAI";
import { rankTasksWithAI } from "@/features/priority/priorityAIRanking";
import { loadTaskBoard, saveTaskBoard } from "@/services/localdb/taskStorage";
// ---------------------------------------------------------------------------
// Tracy's decision logic (US22-24). Kept verbatim - do not change.
// ---------------------------------------------------------------------------

export interface Task {
  taskId: number;
  userId: number;
  taskName: string;
  urgency: "High" | "Medium" | "Low";
  importance: "High" | "Medium" | "Low";
  status: "Pending" | "InProgress" | "Completed";
}

type Level = "High" | "Medium" | "Low";

// ---------------------------------------------------------------------------
// Presentation helpers (new, UI only).
// ---------------------------------------------------------------------------

// The urgency / importance colour scale from the design system. It is a fixed
// semantic scale (red = high, amber = medium, green = low), separate from the
// module accent colours, so it is allowed on any screen.
const BADGE: Record<Level, { fg: string; tint: string }> = {
  High: { fg: T.badgeHigh, tint: "rgba(229, 72, 77, 0.18)" },
  Medium: { fg: T.badgeMed, tint: "rgba(217, 131, 36, 0.18)" },
  Low: { fg: T.badgeLow, tint: "rgba(62, 154, 106, 0.20)" },
};

// Colours the confetti draws from (module + accent colours, no emoji).
export function PriorityScreen() {
  const { colors } = useTheme();
  const accent = moduleAccent(colors, "priority");
  const primaryColor = accent.color;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // ----- Tracy's state (kept) -----
  const [taskName, setTaskName] = useState<string>("");
  const [urgency, setUrgency] = useState<Level>("Medium");
  const [importance, setImportance] = useState<Level>("Medium");
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isRanked, setIsRanked] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isRanking, setIsRanking] = useState<boolean>(false); // New state to track if ranking is in progress
  const [rankingReasons, setRankingReasons] = useState<string[]>([]); // New state to hold AI reasons

  // The board is held on the device, so leaving the screen no longer loses it.
  // Priority kept its tasks in component state and nothing else until now.
  //
  // The guard is the point. Without it the first save fires on mount with the
  // empty initial state and wipes the stored board before the load that would
  // have filled it has come back, so the feature would appear to work and
  // silently erase the list every time the screen opened. Same shape as the
  // hydration guard on the gamification progress.
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    void loadTaskBoard().then((board) => {
      if (!active) return;
      setTaskList(board.tasks);
      setIsRanked(board.isRanked);
      setRankingReasons(board.reasons);
      hydrated.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveTaskBoard({ tasks: taskList, isRanked, reasons: rankingReasons });
  }, [taskList, isRanked, rankingReasons]);

  // Start of this decision, for the Avg. decide figure on Home.
  const decisionStartedAt = useDecisionStart();

  // ----- Tracy's logic (kept verbatim) -----
  const addTask = () => {
    if (taskName.trim() === "") return;
    const newTask: Task = {
      taskId: Date.now(),
      userId: 1,
      taskName,
      urgency,
      importance,
      status: "Pending",
    };
    setTaskList([...taskList, newTask]);
    setTaskName("");
    setIsRanked(false); // Reset to false when new data is added
  };


  const completeTask = (taskId: number) => {
    // Filter out the task by ID to remove it from the list
    setTaskList(taskList.filter((t) => t.taskId !== taskId));
    // Tracy left a hook here for XP; the gamification layer below supplies it.
  };

  const handleRankTasks = async () => {
  const result = await rankTasksWithAI(taskList);

  setTaskList(result.tasks);
  setIsRanked(true);

  setRankingReasons(
    result.aiReasons.length > 0
      ? result.aiReasons
      : [
          "Ranked by urgency + importance. Equal scores use deadline, then oldest task.",
        ]
  );
};

  // ----- Gamification: shared progress via context, feedback via local state -----
  const { progress, awardXp, bumpCompleted, markRanked } = useProgress();
  const [mascotMsg, setMascotMsg] = useState<string>("Let's decide what's next.");

  // Animated values live in state (lazy init) so they are stable across renders
  // and safe to read during render, unlike a ref.
  const [xpBar] = useState(() => new Animated.Value(0));
  const [toastAnim] = useState(() => new Animated.Value(0));
  const [toastText, setToastText] = useState<string>("");

  const cap = capFor(progress.level);
  const title = levelTitle(progress.level);

  // Slides a short "+10 XP" style toast up and fades it out.
  const pushToast = useCallback(
    (text: string) => {
      setToastText(text);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(750),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [toastAnim]
  );

  // The confetti burst now lives above the navigator, so one implementation
  // serves Priority, Fuel and Focus instead of this screen keeping its own.
  const { celebrate } = useCelebration();

  // Animate the XP bar to match the shared progress whenever it changes (from
  // this screen or anywhere else that awards XP).
  React.useEffect(() => {
    Animated.timing(xpBar, {
      toValue: xpFraction(progress.xp, progress.level),
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress.xp, progress.level, xpBar]);

  // Shows the reward feedback for an action and adds the XP to the shared store.
  // Purely presentation; it does not touch the task list.
  const reward = useCallback(
    (amount: number, message: string) => {
      setMascotMsg(message);
      pushToast(`+${amount} XP`);
      awardXp(amount);
    },
    [awardXp, pushToast]
  );

  // Stop any in-flight XP / toast animations when the screen goes away, so no
  // timers leak past unmount.
  React.useEffect(
    () => () => {
      xpBar.stopAnimation();
      toastAnim.stopAnimation();
    },
    [xpBar, toastAnim]
  );

  const onAdd = () => {
    if (taskName.trim() === "") return; 
    if (editingTaskId) {
    // Update existing task
    setTaskList(taskList.map(t => 
      t.taskId === editingTaskId ? { ...t, taskName, urgency, importance } : t
    ));
    setEditingTaskId(null);
  } else {
    addTask();
    reward(10, "Task added, nice.");
  }
  
  setTaskName("");    
  };

  const onEdit = (task: Task) => {
    setEditingTaskId(task.taskId);
    setTaskName(task.taskName);
    setUrgency(task.urgency);
    setImportance(task.importance);
  };

  const onComplete = (taskId: number) => {
    const task = taskList.find((t) => t.taskId === taskId);
    const updatedList = taskList.filter((t) => t.taskId !== taskId);

    setTaskList(updatedList);
    completeTask(taskId);
    bumpCompleted();
    reward(30, "Done. One less decision.");
    celebrate();

    // Record it in the decision history, the same as accepting a meal or a
    // study spot. Priority was the only module that never did this, so finishing
    // a task earned XP but left no trace on the History screen and was missing
    // from the Home count, which made the totals disagree with each other.
    //
    // Completing the top task is this module's version of accepting a
    // recommendation: the ranking is the recommendation, and doing the task is
    // the acceptance. Not awaited, and failure is swallowed, because losing the
    // history row must never cost somebody the XP and the animation they have
    // already been shown.
    if (task) {
      void logDecision({
        moduleType: "priority",
        taskId: String(task.taskId),
        itemSnapshot: {
          name: task.taskName,
          details: { urgency: task.urgency, importance: task.importance },
        },
        appliedFilters: { ranked: isRanked },
        startedAt: decisionStartedAt,
        // Priority has no reroll, so this is always false rather than unknown.
        rerolled: false,
      }).catch(() => {
        // History unavailable is not a reason to fail a completed task.
      });
    }
  };

  // Deleting a task cannot be undone and the delete button sits right next to
  // Complete, so a mis-tap loses work. Confirm first, and name the task in the
  // question so it is obvious which one is about to go.
  const onDelete = (taskId: number) => {
    const task = taskList.find((t) => t.taskId === taskId);

    Alert.alert(
      "Delete this task?",
      task ? `"${task.taskName}" will be removed. This cannot be undone.` : "This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setTaskList(taskList.filter((t) => t.taskId !== taskId)),
        },
      ]
    );
  };

  const onRank = () => {
  if (taskList.length < 2 || isRanking) return;

  Alert.alert(
    "Lock in Priority?",
    // Said here, rather than only in the privacy policy, because this is the
    // moment somebody's own words are about to leave their phone and a notice
    // buried in Settings is not a choice they were offered. Only shown when a
    // tie-break endpoint is actually configured; with none, nothing is sent and
    // warning about it would be its own kind of dishonest.
    isPriorityTieBreakEnabled()
      ? "Once you rank your tasks, you won't be able to edit or delete them.\n\nIf any tasks score the same, those tasks are sent to Google to break the tie, so keep private details out of them."
      : "Once you rank your tasks, you won't be able to edit or delete them. Are you sure?",
    [
      { text: "Not yet", style: "cancel" },
      {
        text: "Rank them",
        onPress: async () => {
          setIsRanking(true);

          try {
            await handleRankTasks();
            markRanked();
            reward(20, "Ranked. Start with #1.");
            celebrate();
          } finally {
            setIsRanking(false);
          }
        },
      },
    ]
  );
};

  // The canonical achievements, unlocked ones first, shown the same way here and
  // on Home.
  const badges = earnedFirst(coreAchievements(progress));

  const canRank = taskList.length >= 2 && !isRanked && !isRanking;
  const xpWidth = xpBar.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <AmbientBackground />
      {/* Back row */}
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={22} color={primaryColor} />
          <Text style={[styles.backText, { color: primaryColor }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Module header */}
        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: accent.tint }]}>
            <Icon name="check-square" size={24} color={primaryColor} />
          </View>
          <View style={styles.titleText}>
            <Text style={[styles.h1, { color: colors.ink }]}>Priority</Text>
            <Text style={[styles.subtitle, { color: colors.ink2 }]}>What should you do first?</Text>
          </View>
        </View>

        {/* Gamification card */}
        <GlassCard style={styles.card}>
          <View style={styles.gamiRow}>
            <View style={[styles.mascot, { backgroundColor: accent.tint, borderColor: colors.cardLine }]}>
              <Icon name="award" size={26} color={primaryColor} />
            </View>
            <View style={styles.gamiBody}>
              <View style={styles.gamiTopRow}>
                <View style={styles.levelWrap}>
                  <View style={[styles.levelPill, { backgroundColor: moduleDeep("priority") }]}>
                    <Text style={styles.levelPillText}>LV {progress.level}</Text>
                  </View>
                  <Text style={[styles.levelTitle, { color: colors.ink }]} numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <View style={[styles.streakChip, { backgroundColor: colors.fuelTint }]}>
                  <GameIcon glyph="fire" size={13} color={colors.fuel} />
                  <Text style={[styles.streakText, { color: colors.fuel }]}>
                    {progress.completedCount}
                  </Text>
                </View>
              </View>

              <View style={[styles.xpTrack, { backgroundColor: colors.track }]}>
                <Animated.View style={[styles.xpFill, { width: xpWidth, backgroundColor: primaryColor }]} />
              </View>

              <View style={styles.gamiBottomRow}>
                <Text style={[styles.mascotMsg, { color: colors.ink2 }]} numberOfLines={1}>
                  {mascotMsg}
                </Text>
                <Text style={[styles.xpText, { color: primaryColor }]}>
                  {progress.xp} / {cap} XP
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.badgeRow, { borderTopColor: colors.cardLine }]}>
            {badges.map((b) => (
              <View key={b.id} style={styles.badge}>
                <View
                  style={[
                    styles.badgeIcon,
                    b.earned
                      ? { backgroundColor: accent.tint, borderColor: colors.cardLine }
                      : { backgroundColor: colors.chip, borderColor: colors.cardLine, opacity: 0.55 },
                  ]}
                >
                  <GameIcon
                    glyph={b.earned ? b.glyph : "lock"}
                    size={16}
                    color={b.earned ? primaryColor : colors.ink3}
                  />
                </View>
                <Text style={[styles.badgeLabel, { color: b.earned ? colors.ink2 : colors.ink3 }]}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Composer */}
        <GlassCard style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.chip, borderColor: colors.cardLine, color: colors.ink },
              ]}
              placeholder="Add a new task"
              placeholderTextColor={colors.ink3}
              value={taskName}
              onChangeText={setTaskName}
              onSubmitEditing={onAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: editingTaskId ? colors.teal : primaryColor }]} // Optional: change color to show "Save" mode
              onPress={onAdd}
              activeOpacity={0.85}
              accessibilityLabel={editingTaskId ? "Save task" : "Add task"}
            >
              {/* If editing, show 'save' icon; if not, show 'plus' icon */}
              <Icon name={editingTaskId ? "save" : "plus"} size={22} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
          {/* Cancel Edit Button */}
          {editingTaskId !== null && (
            <TouchableOpacity 
              onPress={() => {
                setEditingTaskId(null); 
                setTaskName(""); 
              }}
              style={{ marginTop: 10, alignSelf: "flex-end" }}
            >
              <Text style={{ color: colors.ink3, fontFamily: T.font.medium }}>Cancel Edit</Text>
            </TouchableOpacity>
          )}

          <LevelSelector
            label="Urgency"
            hint="how soon"
            selected={urgency}
            onSelect={setUrgency}
            inkColor={colors.ink}
            hintColor={colors.ink2}
            neutralText={colors.ink}
            neutralBg={colors.chip}
            neutralBorder={colors.cardLine}
          />
          <LevelSelector
            label="Importance"
            hint="how much it matters"
            selected={importance}
            onSelect={setImportance}
            inkColor={colors.ink}
            hintColor={colors.ink2}
            neutralText={colors.ink}
            neutralBg={colors.chip}
            neutralBorder={colors.cardLine}
          />
        </GlassCard>

        {/* Status pill */}
        {taskList.length > 0 && (
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[styles.statusDot, { backgroundColor: isRanked ? primaryColor : colors.ink3 }]}
              />
              <Text style={[styles.statusLabel, { color: colors.ink }]}>
                {isRanking
                   ? "Ranking tasks..."
                   : isRanked
                     ? "Ranked by urgency + importance"
                     : "Unsorted"}
              </Text>
            </View>
            <Text style={[styles.taskCount, { color: colors.ink2 }]}>
              {taskList.length} {taskList.length === 1 ? "task" : "tasks"}
            </Text>
          </View>
        )}

        {isRanked && rankingReasons.length > 0 && (
           <View style={{ marginTop: 8 }}>
           {rankingReasons.map((reason, index) => (
            <Text
              key={`${reason}-${index}`}
              style={[
                styles.statusLabel,
                  {
                    color: colors.ink2,
                    lineHeight: 18,
                    marginBottom: 4,
               },
        ]}
      >
        {reason}
      </Text>
    ))}
  </View>
)}

        {/* Task list */}
        <View style={styles.list}>
          {taskList.map((item, index) => {
            const isTop = isRanked && index === 0;
            return (
              <GlassCard
                key={item.taskId}
                style={[
                  styles.taskCard,
                  isTop && { borderColor: primaryColor, borderWidth: 1.5 },
                ]}
              >
                {isRanked && (
                  <View
                    style={[
                      styles.rankChip,
                      isTop ? { backgroundColor: primaryColor } : { backgroundColor: colors.chip },
                    ]}
                  >
                    {isTop ? (
                      <Icon name="award" size={18} color={colors.onAccent} />
                    ) : (
                      <Text style={[styles.rankNum, { color: colors.ink2 }]}>{index + 1}</Text>
                    )}
                  </View>
                )}

                <View style={styles.taskBody}>
                  <Text style={[styles.taskTitle, { color: colors.ink }]}>{item.taskName}</Text>
                  <View style={styles.tagRow}>
                    <LevelBadge kind="Urgency" level={item.urgency} />
                    <LevelBadge kind="Importance" level={item.importance} />
                  </View>
                  {isTop && (
                  <TouchableOpacity
                    disabled={item.status === 'InProgress'}
                    onPress={() => {
                      setTaskList(taskList.map(t => 
                        t.taskId === item.taskId ? { ...t, status: 'InProgress' } : t
                      ));
                    }}
                    style={{
                      marginTop: 12,
                      backgroundColor: item.status === 'InProgress' ? colors.ink3 : primaryColor,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      opacity: item.status === 'InProgress' ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: colors.onAccent, fontWeight: 'bold' }}>
                      {item.status === 'InProgress' ? "In Progress" : "Start Task"}
                    </Text>
                  </TouchableOpacity>
                )}
                </View>

                <View style={styles.taskActions}>
                  {/* Edit Button */}
                  {/* Disable Edit and Delete buttons if isRanked is true */}
                  <TouchableOpacity
                    onPress={() => onEdit(item)}
                    disabled={isRanked}
                    style={[styles.taskActionBtn, { backgroundColor: isRanked ? colors.ink3 : colors.chip, borderColor: colors.cardLine, borderWidth: 1 }]}
                    activeOpacity={0.7}
                  >
                    <Icon name="edit-2" size={17} color={isRanked ? colors.bg : colors.ink3} />
                  </TouchableOpacity>
                  {/* Complete Button */}
                  <TouchableOpacity
                    onPress={() => onComplete(item.taskId)}
                    style={[styles.taskActionBtn, { backgroundColor: colors.tealTint }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Complete task"
                  >
                    <Icon name="check" size={19} color={colors.teal} />
                  </TouchableOpacity>
                  {/* Delete Button */}
                  <TouchableOpacity
                    onPress={() => onDelete(item.taskId)}
                    disabled={isRanked}
                    accessibilityLabel="Delete task"
                    style={[
                      styles.taskActionBtn,
                      { backgroundColor: isRanked ? colors.ink3 : colors.chip, borderColor: colors.cardLine, borderWidth: 1 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash-2" size={17} color={isRanked ? colors.bg : colors.ink3} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })}

          {taskList.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.ink3 }]}>
                All clear. Add a task to decide what is next.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky rank CTA */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.cardLine }]}>
        <TouchableOpacity
          style={[styles.rankButton, { backgroundColor: primaryColor, opacity: canRank ? 1 : 0.4 }]}
          onPress={onRank}
          disabled={!canRank}
          activeOpacity={0.85}
        >
          <Icon name="bar-chart-2" size={20} color={colors.onAccent} />
          <Text style={[styles.rankButtonText, { color: colors.onAccent }]}>
            {isRanking ? "Ranking..." : "Rank my tasks"}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Reward overlays */}
      {toastText !== "" && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              backgroundColor: primaryColor,
              opacity: toastAnim,
              transform: [
                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -8] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.toastText, { color: colors.onAccent }]}>{toastText}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// One urgency / importance picker: a label, a faint hint, and three level
// options coloured by the badge scale when chosen.
type SelectorProps = {
  label: string;
  hint: string;
  selected: Level;
  onSelect: (value: Level) => void;
  inkColor: string;
  hintColor: string;
  neutralText: string;
  neutralBg: string;
  neutralBorder: string;
};

function LevelSelector({
  label,
  hint,
  selected,
  onSelect,
  inkColor,
  hintColor,
  neutralText,
  neutralBg,
  neutralBorder,
}: SelectorProps) {
  const levels: Level[] = ["Low", "Medium", "High"];
  return (
    <View style={styles.selectorGroup}>
      <View style={styles.selectorHeader}>
        <Text style={[styles.selectorLabel, { color: inkColor }]}>{label}</Text>
        <Text style={[styles.selectorHint, { color: hintColor }]}>{hint}</Text>
      </View>
      <View style={styles.selectorRow}>
        {levels.map((lvl) => {
          const active = selected === lvl;
          const palette = BADGE[lvl];
          return (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.selectorOption,
                { backgroundColor: neutralBg, borderColor: neutralBorder },
                active && { backgroundColor: palette.tint, borderColor: palette.fg, borderWidth: 1.5 },
              ]}
              onPress={() => onSelect(lvl)}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectorOptionText, { color: active ? palette.fg : inkColor }]}>
                {lvl}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// A small pill showing an urgency or importance level in its scale colour.
function LevelBadge({ kind, level }: { kind: string; level: Level }) {
  const palette = BADGE[level];
  return (
    <View style={[styles.levelBadge, { backgroundColor: palette.tint }]}>
      <Text style={[styles.levelBadgeKind, { color: palette.fg }]}>{kind} </Text>
      <Text style={[styles.levelBadgeValue, { color: palette.fg }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[3],
    paddingBottom: 120,
    gap: T.spacing[4],
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  backRow: { paddingHorizontal: T.spacing.pageX, paddingTop: HUD_CLEARANCE },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText: { fontFamily: T.font.medium, fontSize: T.fontSize.body },

  titleContainer: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[1] },
  titleText: { flex: 1 },
  iconPlaceholder: { width: 52, height: 52, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginTop: 2 },

  // Cards (gamification + composer + task cards share the glass surface look)
  card: {
    borderRadius: T.radii.card,
    borderWidth: 1,
    padding: T.spacing[4],
    gap: T.spacing[3],
  },

  // Gamification
  gamiRow: { flexDirection: "row", alignItems: "center", gap: T.spacing[3] },
  mascot: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gamiBody: { flex: 1, minWidth: 0, gap: 7 },
  gamiTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelWrap: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  levelPill: { borderRadius: T.radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  levelPillText: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.micro,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  levelTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.body, flexShrink: 1 },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: T.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption },
  xpTrack: { height: 10, borderRadius: T.radii.pill, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: T.radii.pill },
  gamiBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  mascotMsg: { fontFamily: T.font.regular, fontSize: T.fontSize.micro, flexShrink: 1 },
  xpText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.micro },

  badgeRow: { flexDirection: "row", gap: T.spacing[2], borderTopWidth: 1, paddingTop: T.spacing[3] },
  badge: { flex: 1, alignItems: "center", gap: 4 },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: { fontFamily: T.font.monoMedium, fontSize: 10.5, textAlign: "center" },

  // Composer
  inputRow: { flexDirection: "row", gap: T.spacing[3] },
  input: {
    flex: 1,
    height: 48,
    borderRadius: T.radii.input,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
  },
  addButton: { width: 48, height: 48, borderRadius: T.radii.button, justifyContent: "center", alignItems: "center" },

  selectorGroup: { gap: T.spacing[2] },
  selectorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectorLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  selectorHint: { fontFamily: T.font.mono, fontSize: T.fontSize.caption },
  selectorRow: { flexDirection: "row", gap: T.spacing[2] },
  selectorOption: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: T.radii.button,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorOptionText: { fontFamily: T.font.bold, fontSize: T.fontSize.body },

  // Status pill
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: T.spacing[1] },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: T.radii.pill },
  statusLabel: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption },
  taskCount: { fontFamily: T.font.mono, fontSize: T.fontSize.caption },

  // Task list
  list: { gap: T.spacing[3] },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[3],
    borderRadius: T.radii.card,
    borderWidth: 1,
    padding: 15,
  },
  rankChip: { width: 38, height: 38, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  rankNum: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.subtitle },
  taskBody: { flex: 1, minWidth: 0, gap: 9 },
  taskTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle, lineHeight: 20 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: T.radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  levelBadgeKind: { fontFamily: T.font.mono, fontSize: T.fontSize.micro },
  levelBadgeValue: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.micro },
  taskActions: { gap: T.spacing[2] },
  taskActionBtn: { width: 38, height: 38, borderRadius: 11, justifyContent: "center", alignItems: "center" },

  emptyState: { paddingVertical: 26, paddingHorizontal: 20, alignItems: "center" },
  emptyText: { fontFamily: T.font.medium, fontSize: T.fontSize.body, textAlign: "center" },

  // Sticky footer CTA
  footer: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[3],
    paddingBottom: T.spacing[4],
    borderTopWidth: 1,
  },
  rankButton: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  rankButtonText: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle, color: "#FFFFFF" },

  // Overlays
  toast: {
    position: "absolute",
    top: 150,
    alignSelf: "center",
    borderRadius: T.radii.pill,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  toastText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.body, color: "#FFFFFF" },
});
