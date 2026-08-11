// The History screen: the Arcade "mental-energy dashboard", six stacked blocks
// fed entirely from data this slice already owns.
//
//   1. Level card     - level ring + XP-to-next bar (shared progress store)
//   2. This week      - decisions, reroll rate, most active time (history)
//   3. Seven-day bars - decisions per day, today highlighted (history)
//   4. Module counts  - Fuel / Focus / Priority totals (history)
//   5. Achievements   - the eight-badge gallery (progress + history)
//   6. Recent         - the newest accepted decisions (history)
//
// Module colours appear only as data encoding on the per-module tiles; the
// screen's own chrome stays teal, per the brand law.

// Holds the loaded decisions, and reloads them each time the tab is opened.
import { useCallback, useState } from "react";
// The scrolling layout and the text.
import { ScrollView, StyleSheet, Text, View } from "react-native";
// Keeps the content clear of the notch.
import { SafeAreaView } from "react-native-safe-area-context";
// Fires when the tab is focused, which is what keeps the dashboard current.
import { useFocusEffect } from "@react-navigation/native";

// The colour wash behind the dashboard.
import { AmbientBackground } from "@/components/AmbientBackground";
// The badge glyphs, the card surface, the module glyphs and the level ring.
import { GameIcon } from "@/components/GameIcon";
import { GlassCard } from "@/components/GlassCard";
import { ModuleGlyph } from "@/components/ModuleGlyph";
import { ProgressRing } from "@/components/ProgressRing";
// How much top padding clears the floating coin HUD.
import { HUD_CLEARANCE } from "@/components/XpHud";
// The saved decisions, and the aggregations over them.
import { getDecisions, type DecisionModuleType, type DecisionRecord } from "@/features/history/historyStorage";
import { computeHistoryStats, type HistoryStats } from "@/features/history/historyStats";
// The badge set and the level maths, shared with Home and Priority.
import { galleryAchievements } from "@/features/progress/achievements";
import { capFor, levelTitle, xpFraction, XP_PER_DECISION } from "@/features/progress/progress";
import { useProgress } from "@/features/progress/ProgressProvider";
// The module keys and their accents, used only to tint the per-module tiles.
import type { ModuleKey } from "@/theme/modules";
import { moduleAccent } from "@/theme/themes";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";

// The words shown on the per-module tiles.
const MODULE_LABEL: Record<DecisionModuleType, string> = {
  fuel: "Fuel",
  focus: "Focus",
  priority: "Priority",
};

// The order the module tiles appear in, fixed rather than derived from the
// counts, so the tiles do not reshuffle as the numbers change.
const MODULE_ORDER: readonly ModuleKey[] = ["fuel", "focus", "priority"];

// How many recent decisions the list shows. The dashboard is a summary, not the
// full log, so it stays short.
const RECENT_LIMIT = 6;

// The XP each accepted decision is worth, shown on its recent-list pill. The
// figure comes from the progress module, which is also what the Fuel and Focus
// Accept handlers award, so the pill and the running total cannot drift apart.

// What the dashboard shows before the decisions have loaded, and on a fresh
// install. Seven blank bars rather than none, so the chart does not jump into
// place once the data arrives.
const EMPTY_STATS: HistoryStats = {
  weekCount: 0,
  allTime: 0,
  rerollRate: 0,
  mostActive: null,
  moduleCounts: { fuel: 0, focus: 0, priority: 0 },
  weekBars: Array.from({ length: 7 }, () => ({ label: "", count: 0, isToday: false })),
};

// decidedAt is an ISO string. Show a short, readable day-and-time, e.g.
// "5 Jul, 2:15 pm". Falls back to an empty string if the value is ever unusable.
function formatDecidedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Loads the decisions on focus, aggregates them, and renders the six blocks.
export function HistoryScreen() {
  const { colors } = useTheme();
  const { progress } = useProgress();
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>(EMPTY_STATS);

  // Reload on every focus rather than once on mount, so the dashboard is fresh
  // after the user accepts a new recommendation. Stats are derived here (not
  // during render) with an explicit "now", so no clock is read while rendering.
  //
  // Only the history needs this. Level, XP and badges come live from the shared
  // progress provider, which re-renders consumers on its own.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDecisions()
        .then((rows) => {
          if (!active) return;
          setDecisions(rows);
          setStats(computeHistoryStats(rows, Date.now()));
        })
        .catch(() => {
          if (active) {
            setDecisions([]);
            setStats(EMPTY_STATS);
          }
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const level = progress.level;
  const pct = xpFraction(progress.xp, level);
  const cap = capFor(level);
  const badges = galleryAchievements(progress, stats.moduleCounts);
  const recent = decisions.slice(0, RECENT_LIMIT);

  // Tallest bar sets the scale so the chart always uses its full height.
  const maxBar = Math.max(1, ...stats.weekBars.map((d) => d.count));

  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.ink }]}>History</Text>
        <Text style={[styles.subtitle, { color: colors.ink2 }]}>Your mental-energy dashboard</Text>

        {/* 1. Level card */}
        <GlassCard style={styles.levelCard}>
          <ProgressRing
            size={72}
            thickness={8}
            pct={pct}
            color={colors.teal}
            track={colors.track}
            innerColor={colors.cardSolid}
          >
            <Text style={[styles.ringLevel, { color: colors.teal }]}>{level}</Text>
            <Text style={[styles.ringLabel, { color: colors.ink3 }]}>LEVEL</Text>
          </ProgressRing>
          <View style={styles.levelBody}>
            <Text style={[styles.levelTitle, { color: colors.ink }]}>{levelTitle(level)}</Text>
            <Text style={[styles.levelXp, { color: colors.ink2 }]}>
              {progress.xp} / {cap} XP to next level
            </Text>
            <View style={[styles.xpTrack, { backgroundColor: colors.track }]}>
              <View style={[styles.xpFill, { width: `${pct * 100}%`, backgroundColor: colors.teal }]} />
            </View>
          </View>
        </GlassCard>

        {/* 2 + 3. This week + seven-day bars */}
        <GlassCard style={styles.weekCard}>
          <Text style={[styles.sectionLabel, { color: colors.ink2 }]}>THIS WEEK</Text>
          <View style={styles.statsRow}>
            <Stat value={String(stats.weekCount)} label="Decisions" color={colors.teal} inkColor={colors.ink2} />
            <Stat value={`${stats.rerollRate}%`} label="Reroll rate" color={colors.fuel} inkColor={colors.ink2} />
            <Stat
              value={stats.mostActive ?? "-"}
              label="Most active"
              color={colors.priority}
              inkColor={colors.ink2}
            />
          </View>
          <View style={styles.barRow}>
            {stats.weekBars.map((day, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(day.count > 0 ? 12 : 6, (day.count / maxBar) * 100)}%`,
                        // Solid accent both ways, with the non-today days dimmed by
                        // opacity rather than a faint tint: the tint is near-invisible
                        // on the light theme's pale surface, while a translucent solid
                        // stays legible in both themes.
                        backgroundColor: colors.teal,
                        opacity: day.isToday ? 1 : 0.4,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: day.isToday ? colors.teal : colors.ink3 }]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 4. Module counts */}
        <View style={styles.countGrid}>
          {MODULE_ORDER.map((key) => {
            const accent = moduleAccent(colors, key);
            return (
              <View key={key} style={[styles.countTile, { backgroundColor: accent.tint }]}>
                <Text style={[styles.countNum, { color: accent.color }]}>{stats.moduleCounts[key]}</Text>
                <Text style={[styles.countLabel, { color: accent.color }]}>{MODULE_LABEL[key]}</Text>
              </View>
            );
          })}
        </View>

        {/* 5. Achievements */}
        <Text style={[styles.sectionLabel, styles.blockLabel, { color: colors.ink3 }]}>ACHIEVEMENTS</Text>
        <GlassCard style={styles.badgeCard}>
          <View style={styles.badgeGrid}>
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
                    size={19}
                    color={b.earned ? colors.teal : colors.ink3}
                  />
                </View>
                <Text
                  style={[styles.badgeLabel, { color: b.earned ? colors.ink2 : colors.ink3 }]}
                  numberOfLines={1}
                >
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 6. Recent decisions */}
        <Text style={[styles.sectionLabel, styles.blockLabel, { color: colors.ink3 }]}>RECENT DECISIONS</Text>
        {recent.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No decisions yet</Text>
            <Text style={[styles.emptyBody, { color: colors.ink2 }]}>
              Accept a Fuel or Focus recommendation and it will show up here.
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.recentList}>
            {recent.map((d) => {
              const accent = moduleAccent(colors, d.moduleType);
              return (
                <GlassCard key={d.historyId} style={styles.recentRow}>
                  <View style={[styles.recentIcon, { backgroundColor: accent.tint }]}>
                    <ModuleGlyph moduleKey={d.moduleType} size={20} color={accent.color} />
                  </View>
                  <View style={styles.recentBody}>
                    <Text style={[styles.recentName, { color: colors.ink }]} numberOfLines={1}>
                      {d.itemSnapshot.name}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.ink2 }]} numberOfLines={1}>
                      {MODULE_LABEL[d.moduleType]} · {formatDecidedAt(d.decidedAt)}
                      {d.rerolled ? " · rerolled" : ""}
                    </Text>
                  </View>
                  <View style={[styles.xpPill, { backgroundColor: colors.tealTint }]}>
                    <Text style={[styles.xpPillText, { color: colors.teal }]}>+{XP_PER_DECISION}</Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// One stat column in the THIS WEEK card: a big mono number over a small label.
// One figure with its caption, used across the weekly summary row.
function Stat({
  value,
  label,
  color,
  inkColor,
}: {
  value: string;
  label: string;
  color: string;
  inkColor: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: inkColor }]}>{label}</Text>
    </View>
  );
}

// Only non-colour properties live here (layout, spacing, sizes, font names).
// Colours are applied inline from useTheme() because StyleSheet.create runs once
// at import, before a theme is known, so a colour baked in here could not switch.
const styles = StyleSheet.create({
  frame: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: HUD_CLEARANCE,
    paddingBottom: T.spacing[7],
  },
  title: { fontFamily: T.font.bold, fontSize: 27, letterSpacing: -0.4 },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.subtitle, marginTop: 4, marginBottom: T.spacing[4] },

  // Level card
  levelCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: T.spacing[4] },
  ringLevel: { fontFamily: T.font.monoMedium, fontSize: 19, lineHeight: 21 },
  ringLabel: { fontFamily: T.font.mono, fontSize: 8.5, letterSpacing: 0.6, marginTop: 1 },
  levelBody: { flex: 1, minWidth: 0 },
  levelTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  levelXp: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginTop: 3, marginBottom: 9 },
  xpTrack: { height: 8, borderRadius: T.radii.pill, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: T.radii.pill },

  // This week + bars
  weekCard: { padding: T.spacing[4], marginTop: T.spacing[3] },
  sectionLabel: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption, letterSpacing: 0.5 },
  blockLabel: { marginTop: T.spacing[4], marginBottom: T.spacing[3] },
  statsRow: { flexDirection: "row", marginTop: T.spacing[3], marginBottom: T.spacing[4] },
  stat: { flex: 1, gap: 3 },
  statValue: { fontFamily: T.font.monoMedium, fontSize: 23 },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 9, height: 92 },
  barCol: { flex: 1, alignItems: "center", gap: 9 },
  barTrack: { width: "100%", height: 70, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 8, minHeight: 6 },
  barLabel: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption },

  // Module counts
  countGrid: { flexDirection: "row", gap: 12, marginTop: T.spacing[4] },
  countTile: { flex: 1, borderRadius: 18, paddingVertical: 20, alignItems: "center" },
  countNum: { fontFamily: T.font.monoMedium, fontSize: 26 },
  countLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body, marginTop: 4 },

  // Achievements
  badgeCard: { padding: T.spacing[4] },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap" },
  badge: { width: "25%", alignItems: "center", gap: 5, marginBottom: T.spacing[3] },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: { fontFamily: T.font.monoMedium, fontSize: 9.5, textAlign: "center" },

  // Recent
  recentList: { gap: 12 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 15, padding: 15 },
  recentIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  recentBody: { flex: 1, minWidth: 0 },
  recentName: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  recentMeta: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginTop: 2 },
  xpPill: { borderRadius: T.radii.pill, paddingHorizontal: 9, paddingVertical: 4 },
  xpPillText: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.caption },

  emptyCard: { padding: T.spacing[4] },
  emptyTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle, marginBottom: T.spacing[1] },
  emptyBody: { fontFamily: T.font.regular, fontSize: T.fontSize.body, lineHeight: 20 },
});
