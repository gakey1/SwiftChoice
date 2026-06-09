// Home dashboard (US02). Based on Tracy's work in PR #5, reconciled with the
// navigation and colour rules: lives under screens/home, named export, teal on
// this universal surface (green stays on Focus screens), typed module prop.
//
// The weekly stats are a static placeholder; the live data lands with the
// dashboard story (US27) in Sprint 4.

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { ModuleIcon } from "@/components/ModuleIcon";
import { MODULES, type Module } from "@/theme/modules";
import { T } from "@/theme/tokens";

type ModuleRowCardProps = {
  title: string;
  subtitle: string;
  module: Module;
  onPress: () => void;
};

function ModuleRowCard({ title, subtitle, module, onPress }: ModuleRowCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardClickable}>
      <Card style={styles.cardRow}>
        <View style={styles.leftContent}>
          <ModuleIcon module={module} />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Icon name="chevron-right" />
      </Card>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <Text style={styles.h1}>SwiftChoice</Text>
        </View>

        <Text style={styles.greetingText}>
          Good morning! What decision can I help with today?
        </Text>

        <View style={styles.modulesWrapper}>
          <ModuleRowCard
            title="Fuel"
            subtitle="Decide what to eat"
            module={MODULES.fuel}
            onPress={() => {
              // TODO: navigate to the Fuel input screen (Sprint 2).
            }}
          />
          <ModuleRowCard
            title="Focus"
            subtitle="Find your ideal workspace"
            module={MODULES.focus}
            onPress={() => {
              // TODO: navigate to the Focus input screen (Sprint 2).
            }}
          />
          <ModuleRowCard
            title="Priority"
            subtitle="Know what to tackle first"
            module={MODULES.priority}
            onPress={() => {
              // TODO: navigate to the Priority input screen (Sprint 2).
            }}
          />
        </View>

        <Card style={styles.analyticsCard}>
          <Text style={styles.analyticsHeader}>THIS WEEK</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Decisions</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>3min</Text>
              <Text style={styles.statLabel}>Avg. saved</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>18%</Text>
              <Text style={styles.statLabel}>Reroll rate</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: T.canvas, width: "100%" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[5],
    paddingBottom: T.spacing[7],
    gap: T.spacing[4],
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[3],
    marginTop: T.spacing[2],
  },
  avatarContainer: {
    width: 42,
    height: 42,
    backgroundColor: T.teal,
    borderRadius: T.radii.logo,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontFamily: T.font.bold, color: T.tealOn, fontSize: T.fontSize.title },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  greetingText: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    color: T.fg2,
    lineHeight: 24,
  },
  modulesWrapper: { gap: T.spacing[3] },
  cardClickable: { width: "100%" },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: T.spacing[3],
  },
  leftContent: { flexDirection: "row", alignItems: "center", gap: T.spacing[3] },
  textContainer: { justifyContent: "center" },
  cardTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.title, color: T.fg1 },
  cardSubtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginTop: 2,
  },
  analyticsCard: { padding: T.spacing[4], marginTop: T.spacing[2] },
  analyticsHeader: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.caption,
    color: T.fg2,
    letterSpacing: 1,
    marginBottom: T.spacing[3],
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCol: { alignItems: "center", flex: 1 },
  statValue: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.teal,
    marginBottom: 4,
  },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption, color: T.fg2 },
});
