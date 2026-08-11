// The home dashboard, the first screen after login: a player card with level
// and XP, a daily quest nudge, the three module cards, and a THIS WEEK summary
// of the real decision history.
//
// A universal screen, so its own chrome is teal and only the module cards
// carry a module accent.

import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AmbientBackground } from "@/components/AmbientBackground";
import { DashedOutline } from "@/components/DashedOutline";
import { GameIcon } from "@/components/GameIcon";
import { Glow } from "@/components/Glow";
import { GLASS_RADIUS, GlassCard } from "@/components/GlassCard";
import { Icon } from "@/components/Icon";
import { ModuleGlyph } from "@/components/ModuleGlyph";
import { HUD_CLEARANCE } from "@/components/XpHud";
import { getDecisions } from "@/features/history/historyStorage";
import { averageSavedSeconds, formatDuration } from "@/features/history/historyStats";
import { greetingFor } from "@/features/home/greeting";
import { coreAchievements, earnedFirst } from "@/features/progress/achievements";
import { capFor, levelTitle, xpFraction } from "@/features/progress/progress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { avatarAt } from "@/features/profile/avatars";
import type { AppStackParamList, AppTabsParamList } from "@/navigation/types";
import { loadAvatarIndex } from "@/services/localdb/profileStorage";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";

// The avatar, and the halo drawn behind it. The design specifies a "0 0 18px"
// glow, so the glow box is the avatar plus that radius on every side.
const AVATAR_SIZE = 52;
const AVATAR_GLOW = AVATAR_SIZE + 18 * 2;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Summary of the decision history shown on Home, derived when the data loads so
// no clock is read during render. The THIS WEEK snapshot is scoped to the week
// to match its heading.
type DecisionStats = {
  weekCount: number;
  rerollRate: number;
  // Average seconds saved per decision this week, or null when no decision this
  // week recorded a start and there is nothing to subtract from. See
  // ASSUMED_MINUTES_WITHOUT_APP for what "saved" is measured against; the basis
  // is set out in the Terms of use screen.
  savedSeconds: number | null;
};

const EMPTY_STATS: DecisionStats = { weekCount: 0, rerollRate: 0, savedSeconds: null };

type ModuleKey = "fuel" | "focus" | "priority";

const MODULE_CARDS: {
  key: ModuleKey;
  // Only the three module routes, rather than any key of the stack. The wider
  // type happened to compile while every route took no parameters, and stopped
  // the moment one of them needed some, which is the right time to find out: a
  // card here can only ever open a module.
  route: "Fuel" | "Focus" | "Priority";
  name: string;
  sub: string;
}[] = [
  { key: "fuel", route: "Fuel", name: "Fuel", sub: "Decide what to eat" },
  { key: "focus", route: "Focus", name: "Focus", sub: "Find your ideal workspace" },
  { key: "priority", route: "Priority", name: "Priority", sub: "Know what to tackle first" },
];

export function HomeScreen() {
  const { colors, isDark, toggleDark } = useTheme();
  // Home sits in the tab navigator, which itself sits in the app stack. The
  // composite type is what makes both legal from here: navigate("Fuel") goes up
  // to the stack, and navigate("settings") switches tab.
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<AppTabsParamList>,
        NativeStackNavigationProp<AppStackParamList>
      >
    >();

  const { progress } = useProgress();
  const [stats, setStats] = useState<DecisionStats>(EMPTY_STATS);
  const [avatarIndex, setAvatarIndex] = useState(0);
  // Worked out when the screen comes into focus rather than during render, the
  // same rule the week figures follow, so no clock is read while rendering.
  // Refreshing on focus also means it corrects itself if the app is left open
  // across a boundary and returned to.
  const [greeting, setGreeting] = useState(() => greetingFor(new Date().getHours()));

  // Reload history and the avatar every time Home comes into focus. Progress
  // (level, XP, streak) comes live from the shared provider, so it needs no
  // manual reload. The THIS WEEK figures are derived here (not during render) so
  // no clock is read while rendering.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setGreeting(greetingFor(new Date().getHours()));
      void loadAvatarIndex().then((i) => {
        if (active) setAvatarIndex(i);
      });
      void getDecisions()
        .then((decisions) => {
          if (!active) return;
          const weekAgo = Date.now() - WEEK_MS;
          const week = decisions.filter((d) => new Date(d.decidedAt).getTime() >= weekAgo);
          const weekCount = week.length;
          setStats({
            weekCount,
            rerollRate:
              weekCount > 0
                ? Math.round((week.filter((d) => d.rerolled).length / weekCount) * 100)
                : 0,
            savedSeconds: averageSavedSeconds(week),
          });
        })
        .catch(() => {
          // History unavailable is non-fatal; the card just shows its empty state.
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const title = levelTitle(progress.level);
  const pct = xpFraction(progress.xp, progress.level) * 100;
  const cap = capFor(progress.level);

  const badges = earnedFirst(coreAchievements(progress));

  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <AmbientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.teal }]}>
              <Text style={[styles.logoText, { color: colors.onAccent }]}>S</Text>
            </View>
            <Text style={[styles.brandName, { color: colors.ink }]}>SwiftChoice</Text>
          </View>
          <TouchableOpacity
            onPress={toggleDark}
            style={[styles.darkBtn, { backgroundColor: colors.cardSolid, borderColor: colors.cardLine }]}
            accessibilityLabel="Toggle dark mode"
            activeOpacity={0.7}
          >
            <Icon name={isDark ? "sun" : "moon"} size={19} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.greeting, { color: colors.ink }]}>{greeting}</Text>

        {/* Player card */}
        <GlassCard style={styles.playerCard}>
          <View style={styles.playerRow}>
            {/* Tapping the avatar opens Settings, which is where it is changed.
                The design wires the same tap ("Edit profile"), and it is the
                first place people try. The glow is the avatar's own signature
                colour, not a module colour, so it is legal on any screen. */}
            <TouchableOpacity
              onPress={() => navigation.navigate("settings")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <View style={styles.avatarWrap}>
                <Glow color={avatarAt(avatarIndex).color} size={AVATAR_GLOW} />
                <Image
                  source={avatarAt(avatarIndex).source}
                  style={[styles.avatar, { borderColor: colors.cardLine }]}
                />
              </View>
            </TouchableOpacity>
            <View style={styles.playerBody}>
              <View style={styles.playerTop}>
                <View style={styles.levelWrap}>
                  <View style={[styles.levelPill, { backgroundColor: colors.teal }]}>
                    <Text style={[styles.levelPillText, { color: colors.onAccent }]}>
                      LV {progress.level}
                    </Text>
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
                <View style={[styles.xpFill, { width: `${pct}%`, backgroundColor: colors.teal }]} />
              </View>
              <View style={styles.playerBottom}>
                <Text style={[styles.mascotMsg, { color: colors.ink2 }]}>Keep making good calls.</Text>
                <Text style={[styles.xpText, { color: colors.teal }]}>
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
                      ? { backgroundColor: colors.tealTint, borderColor: colors.teal }
                      : { backgroundColor: colors.chip, borderColor: colors.cardLine, opacity: 0.55 },
                  ]}
                >
                  <GameIcon
                    glyph={b.earned ? b.glyph : "lock"}
                    size={16}
                    color={b.earned ? colors.teal : colors.ink3}
                  />
                </View>
                <Text style={[styles.badgeLabel, { color: b.earned ? colors.ink2 : colors.ink3 }]}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Daily quest */}
        {/* The dashed edge is drawn by DashedOutline rather than by borderStyle,
            which cannot render dashes around a corner. See that component. */}
        <GlassCard style={styles.questCard}>
          <DashedOutline color={colors.teal} radius={GLASS_RADIUS} thickness={1.5} />
          <View style={[styles.questIcon, { backgroundColor: colors.tealTint }]}>
            <Icon name="star" size={21} color={colors.teal} />
          </View>
          <View style={styles.questBody}>
            <Text style={[styles.questTitle, { color: colors.ink }]}>Keep the momentum</Text>
            <Text style={[styles.questSub, { color: colors.ink2 }]}>
              Make a decision today to earn XP
            </Text>
          </View>
          <View style={[styles.questPill, { backgroundColor: colors.tealTint }]}>
            <Text style={[styles.questPillText, { color: colors.teal }]}>+50 XP</Text>
          </View>
        </GlassCard>

        {/* Module cards */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>CHOOSE A DECISION</Text>
        <View style={styles.moduleList}>
          {MODULE_CARDS.map((m) => {
            const accent = moduleAccent(colors, m.key);
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(m.route)}
              >
                <GlassCard style={styles.moduleCard}>
                  <View style={[styles.moduleIcon, { backgroundColor: accent.tint }]}>
                    <ModuleGlyph moduleKey={m.key} size={24} color={accent.color} />
                  </View>
                  <View style={styles.moduleText}>
                    <Text style={[styles.moduleName, { color: colors.ink }]}>{m.name}</Text>
                    <Text style={[styles.moduleSub, { color: colors.ink2 }]}>{m.sub}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.ink3} />
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* This week */}
        <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>THIS WEEK</Text>
        <GlassCard style={styles.weekCard}>
          {stats.weekCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>No decisions yet this week</Text>
              <Text style={[styles.emptyBody, { color: colors.ink2 }]}>
                Your weekly snapshot appears here once you start making decisions.
              </Text>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <Stat
                value={String(stats.weekCount)}
                label="Decisions"
                color={colors.teal}
                inkColor={colors.ink2}
              />
              <Stat
                value={formatDuration(stats.savedSeconds)}
                label="Avg. saved"
                color={colors.priority}
                inkColor={colors.ink2}
                dividerColor={colors.cardLine}
              />
              <Stat
                value={`${stats.rerollRate}%`}
                label="Reroll rate"
                color={colors.fuel}
                inkColor={colors.ink2}
                dividerColor={colors.cardLine}
              />
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// One stat column in the THIS WEEK card: a big mono number over a small label,
// with an optional left divider between columns.
function Stat({
  value,
  label,
  color,
  inkColor,
  dividerColor,
}: {
  value: string;
  label: string;
  color: string;
  inkColor: string;
  dividerColor?: string;
}) {
  return (
    <View style={[styles.stat, dividerColor ? { borderLeftWidth: 1, borderLeftColor: dividerColor } : null]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: inkColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    // Start below the floating XP HUD so the header (and its dark-mode toggle,
    // which is also top-right) sits under the HUD, not behind it.
    paddingTop: HUD_CLEARANCE,
    paddingBottom: T.spacing[7],
    gap: T.spacing[3],
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.spacing[1],
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logoText: { fontFamily: T.font.bold, color: "#FFFFFF", fontSize: T.fontSize.title },
  brandName: { fontFamily: T.font.bold, fontSize: 19 },
  darkBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  greeting: {
    fontFamily: T.font.bold,
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: T.spacing[2],
  },

  // Player card
  playerCard: { padding: T.spacing[4] },
  playerRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  // The glow is drawn larger than the avatar and pulled back in by a negative
  // margin, so it occupies the avatar's 52 points in layout while painting the
  // full 80. Without that the player row would shift by the halo's width.
  avatarWrap: {
    width: AVATAR_GLOW,
    height: AVATAR_GLOW,
    margin: (AVATAR_SIZE - AVATAR_GLOW) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 999,
    borderWidth: 2,
    // No shadow or elevation here. The design's "0 0 18px" halo is a real view
    // now (see Glow): shadowColor is ignored on Android, and elevation on a
    // circle draws an octagon there rather than a ring.
  },
  playerBody: { flex: 1, minWidth: 0, gap: 7 },
  playerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  playerBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  mascotMsg: { fontFamily: T.font.regular, fontSize: T.fontSize.micro, flexShrink: 1 },
  xpText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.micro },
  badgeRow: { flexDirection: "row", gap: T.spacing[2], borderTopWidth: 1, paddingTop: T.spacing[3], marginTop: T.spacing[3] },
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

  // Quest
  questCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[3],
    padding: T.spacing[3],
    // No border here. GlassCard's hairline is replaced by the dashed outline
    // drawn on top, and keeping both would show a solid line under the dashes.
    borderWidth: 0,
  },
  questIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  questBody: { flex: 1 },
  questTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  questSub: { fontFamily: T.font.regular, fontSize: T.fontSize.caption, marginTop: 2 },
  questPill: { borderRadius: T.radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  questPillText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption },

  sectionLabel: {
    fontFamily: T.font.monoMedium,
    fontSize: T.fontSize.caption,
    letterSpacing: 0.5,
    marginTop: T.spacing[3],
    marginBottom: 2,
  },

  // Module cards
  moduleList: { gap: T.spacing[3] },
  moduleCard: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], padding: 15, borderRadius: 20 },
  moduleIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  moduleText: { flex: 1 },
  moduleName: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  moduleSub: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginTop: 2 },

  // This week
  weekCard: { padding: T.spacing[4] },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.title },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  emptyState: { paddingVertical: T.spacing[1] },
  emptyTitle: { fontFamily: T.font.medium, fontSize: T.fontSize.body, marginBottom: 4 },
  emptyBody: { fontFamily: T.font.regular, fontSize: T.fontSize.body, lineHeight: 20 },
});
