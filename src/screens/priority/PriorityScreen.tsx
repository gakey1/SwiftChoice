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

import React, { useCallback, useState } from "react";
import {
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

import { GameIcon } from "@/components/GameIcon";
import { Icon } from "@/components/Icon";
import { HUD_CLEARANCE } from "@/components/XpHud";
import type { AppStackParamList } from "@/navigation/types";
import { coreAchievements, earnedFirst } from "@/features/progress/achievements";
import { capFor, levelTitle, xpFraction } from "@/features/progress/progress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";

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
const CONFETTI_COLORS = ["priority", "teal", "fuel", "focus"] as const;

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

  const handleRankTasks = () => {
    const sorted = [...taskList].sort((a, b) => {
      const map: Record<"High" | "Medium" | "Low", number> = {
        High: 3,
        Medium: 2,
        Low: 1,
      };
      const scoreA = map[a.urgency] + map[a.importance];
      const scoreB = map[b.urgency] + map[b.importance];
      return scoreB - scoreA;
    });
    setTaskList(sorted);
    setIsRanked(true);
  };

  // ----- Gamification: shared progress via context, feedback via local state -----
  const { progress, awardXp, bumpCompleted, markRanked } = useProgress();
  const [mascotMsg, setMascotMsg] = useState<string>("Let's decide what's next.");
  const [confettiKey, setConfettiKey] = useState<number>(0);

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

  // Fires a confetti burst by bumping the key, which remounts the overlay.
  const celebrate = useCallback(() => {
    setConfettiKey((k) => k + 1);
  }, []);

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

  // ----- UI handlers: call Tracy's logic, then layer the rewards on top -----
  const onAdd = () => {
    if (taskName.trim() === "") return; // mirror Tracy's guard so we only reward real adds
    addTask();
    reward(10, "Task added, nice.");
  };

  const onComplete = (taskId: number) => {
    completeTask(taskId);
    bumpCompleted();
    reward(30, "Done. One less decision.");
    celebrate();
  };

  const onDelete = (taskId: number) => {
    // Same inline delete Tracy wired to the delete button, unchanged.
    setTaskList(taskList.filter((t) => t.taskId !== taskId));
  };

  const onRank = () => {
    if (taskList.length < 2) return;
    handleRankTasks();
    markRanked();
    reward(20, "Ranked. Start with #1.");
    celebrate();
  };

  // The canonical achievements, unlocked ones first, shown the same way here and
  // on Home.
  const badges = earnedFirst(coreAchievements(progress));

  const canRank = taskList.length >= 2;
  const xpWidth = xpBar.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
          <View style={styles.gamiRow}>
            <View style={[styles.mascot, { backgroundColor: accent.tint, borderColor: colors.cardLine }]}>
              <Icon name="award" size={26} color={primaryColor} />
            </View>
            <View style={styles.gamiBody}>
              <View style={styles.gamiTopRow}>
                <View style={styles.levelWrap}>
                  <View style={[styles.levelPill, { backgroundColor: primaryColor }]}>
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
        </View>

        {/* Composer */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
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
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={onAdd}
              activeOpacity={0.85}
              accessibilityLabel="Add task"
            >
              <Icon name="plus" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <LevelSelector
            label="Urgency"
            hint="how soon"
            selected={urgency}
            onSelect={setUrgency}
            inkColor={colors.ink}
            hintColor={colors.ink3}
            neutralText={colors.ink2}
            neutralBg={colors.chip}
            neutralBorder={colors.cardLine}
          />
          <LevelSelector
            label="Importance"
            hint="how much it matters"
            selected={importance}
            onSelect={setImportance}
            inkColor={colors.ink}
            hintColor={colors.ink3}
            neutralText={colors.ink2}
            neutralBg={colors.chip}
            neutralBorder={colors.cardLine}
          />
        </View>

        {/* Status pill */}
        {taskList.length > 0 && (
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[styles.statusDot, { backgroundColor: isRanked ? primaryColor : colors.ink3 }]}
              />
              <Text style={[styles.statusLabel, { color: colors.ink }]}>
                {isRanked ? "Ranked by urgency + importance" : "Unsorted"}
              </Text>
            </View>
            <Text style={[styles.taskCount, { color: colors.ink2 }]}>
              {taskList.length} {taskList.length === 1 ? "task" : "tasks"}
            </Text>
          </View>
        )}

        {/* Task list */}
        <View style={styles.list}>
          {taskList.map((item, index) => {
            const isTop = isRanked && index === 0;
            return (
              <View
                key={item.taskId}
                style={[
                  styles.taskCard,
                  { backgroundColor: colors.card, borderColor: colors.cardLine },
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
                      <Icon name="award" size={18} color="#FFFFFF" />
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
                </View>

                <View style={styles.taskActions}>
                  <TouchableOpacity
                    onPress={() => onComplete(item.taskId)}
                    style={[styles.taskActionBtn, { backgroundColor: colors.tealTint }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Complete task"
                  >
                    <Icon name="check" size={19} color={colors.teal} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDelete(item.taskId)}
                    style={[
                      styles.taskActionBtn,
                      { backgroundColor: colors.chip, borderColor: colors.cardLine, borderWidth: 1 },
                    ]}
                    activeOpacity={0.7}
                    accessibilityLabel="Delete task"
                  >
                    <Icon name="trash-2" size={17} color={colors.ink3} />
                  </TouchableOpacity>
                </View>
              </View>
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
          <Icon name="bar-chart-2" size={20} color="#FFFFFF" />
          <Text style={styles.rankButtonText}>Rank my tasks</Text>
        </TouchableOpacity>
      </View>

      {/* Reward overlays */}
      <ConfettiOverlay key={confettiKey} trigger={confettiKey} colors={colors} />
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
          <Text style={styles.toastText}>{toastText}</Text>
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
              <Text style={[styles.selectorOptionText, { color: active ? palette.fg : neutralText }]}>
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

// A one-shot confetti burst. It mounts a set of coloured squares and animates
// them falling, then leaves them faded out. Remounting (via a changing key)
// starts a fresh burst. Built from plain Views + Animated, no extra library.
function ConfettiOverlay({
  trigger,
  colors,
}: {
  trigger: number;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      anim: new Animated.Value(0),
      left: 8 + Math.random() * 84,
      size: 6 + Math.random() * 6,
      drift: Math.random() * 120 - 60,
      rotate: Math.random() * 360,
      colorKey: CONFETTI_COLORS[i % CONFETTI_COLORS.length] as (typeof CONFETTI_COLORS)[number],
      round: Math.random() > 0.5,
    }))
  );

  React.useEffect(() => {
    if (trigger === 0) return undefined;
    const animations = particles.map((p) => {
      p.anim.setValue(0);
      return Animated.timing(p.anim, {
        toValue: 1,
        duration: 1100 + Math.random() * 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
    });
    const composite = Animated.parallel(animations);
    composite.start();
    // Stop the burst if the overlay unmounts before it finishes.
    return () => composite.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 90,
            width: p.size,
            height: p.size * 1.4,
            borderRadius: p.round ? 999 : 2,
            backgroundColor: colors[p.colorKey],
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 460] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              {
                rotate: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${p.rotate + 360}deg`],
                }),
              },
            ],
          }}
        />
      ))}
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
    fontFamily: T.font.monoMedium,
    fontSize: T.fontSize.micro,
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
  badgeLabel: { fontFamily: T.font.mono, fontSize: 9.5, textAlign: "center" },

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
    borderWidth: 1,
    borderRadius: T.radii.button,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorOptionText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.body },

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
  emptyText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, textAlign: "center" },

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
  confettiLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
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
